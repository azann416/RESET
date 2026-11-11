# RESET optional accounts and manual sync

## Current status

Implementation is in the existing workspace root, not `reset/`. Guest mode, localStorage key `reset.wellbeing.v1`, moods, and PWA caching remain intact. No database migration or live Supabase request was run during implementation. Live Auth, RLS, and sync are **not yet verified**. Uploads are blocked by the server policies until the supplied SQL tests pass.

## 1. Create/select your Supabase project

Use your own Supabase dashboard. Choose the project's hosting region and review its retention/privacy settings before inviting real users. Review the SQL files before running them. They add new objects; the migration deliberately fails if those names already exist instead of overwriting an existing schema.

From the project's **Connect** dialog or **Project Settings → API Keys**, obtain its project URL and **publishable** key (`sb_publishable_…`). Never use `sb_secret_…`, a `service_role` key, or a legacy privileged JWT in this app. Vite variables are public build-time values; a publishable key does not replace RLS.

Copy `.env.example` to `.env.local` in the workspace root. Guest use requires no configuration. Keep sync disabled until live database security verification has passed:

```dotenv
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_YOUR_PUBLISHABLE_KEY
VITE_ENABLE_SUPABASE_SYNC=false
```

`.env.local` is ignored by Git. Restart Vite after editing it. Rebuild production when changing configuration. Do not paste private keys into chat, source files, or the SQL editor scripts.

Only after the live migration, RLS ownership/isolation checks, and verification script all pass, may you change `VITE_ENABLE_SUPABASE_SYNC` to `true` in the deployment environment. The app also calls `reset_sync_ready()` before every cloud read, write, or deletion; a false, missing, or failed verification response continues to block sync. The opt-in is an additional fail-closed control, not a substitute for database verification.

## 2. Configure email Auth and redirects

In **Authentication → Sign In / Providers → Email** (the menu may be labelled Providers), enable Email sign-in. Keep the magic-link template and confirmation enabled. For public use, configure your SMTP provider and review Auth email limits; the default delivery service may restrict recipients.

In **Authentication → URL Configuration**:

- Set **Site URL** to the final HTTPS production origin (or `http://localhost:5173` for initial local setup).
- Add these exact **Redirect URLs** for the ports you actually use:
  - `http://localhost:5173/?account=1`
  - `http://localhost:4173/?account=1`
  - `http://localhost:4174/?account=1` if using that preview
  - `https://YOUR_PRODUCTION_DOMAIN/?account=1`
- Avoid broad production wildcard redirects. If Vite chooses another port, allowlist its exact origin/redirect or restart on a stable port.

The app uses PKCE and redirects to the current browser origin, with no user-supplied redirect target. Open emailed links in the same browser/profile where you requested them. Opening a link in another browser or installed-app storage context may fail; request a new link in the desired context. Auth session tokens are stored locally under `reset.auth.v1`. They are separate from wellbeing data. Nothing uploads on login.

## 3. Apply the additive migration yourself

Open your project → **SQL Editor → New query**. Paste the complete contents of:

`supabase/migrations/202611100001_reset_optional_sync.sql`

Select the `postgres` role and run the **entire script** once. It creates:

- `public.reset_progress`: one row per Auth user, only category, date, the fixed `elapsed_days` preference, UUID revision, and modification timestamp.
- Four authenticated-only ownership policies, RLS enabled and forced, no anonymous table privileges.
- A private verification marker plus `reset_sync_ready()` RPC. No client can update the marker. Policy changes invalidate its signature.
- A trigger that changes revision on every update, preventing silent overwrite by stale clients, including deletion/recreation races.

Do not disable RLS to resolve an error. If objects already exist, stop and review the existing schema before adapting the migration. Do not select isolated lines to bypass transaction errors.

## 4. Run isolation tests and enable syncing

Create **two disposable email Auth accounts** in **Authentication → Users → Add user**, or sign up through RESET using two test email addresses. Copy their different user UUIDs. Do not use real wellbeing data for these checks.

In **SQL Editor → New query**, paste all of:

`supabase/tests/verify_and_enable_sync.sql`

Replace `REPLACE_WITH_TEST_USER_A_UUID` and `REPLACE_WITH_TEST_USER_B_UUID` with those IDs. Run the **whole script as postgres**. It impersonates the authenticated and anonymous database roles and checks:

- Owner read/create/update/delete.
- Cross-user read/update/delete isolation and rejected cross-user insertion.
- No changes to row ownership or the private verification marker.
- No anonymous read/create access.
- Rejected stale revision updates.
- Rejected uploads while the verification gate is closed.

Test mutations are inside a savepoint and are rolled back; pre-existing test-user progress is restored. Only after all assertions pass does the transaction commit the verification marker. The final result must be **`sync_verified = true`**. If any step fails, do not enable the marker manually; roll back the failed transaction if needed, fix the cause, and rerun the whole test. The app and RLS both refuse uploads before verification. This test is supplied, not already executed or certified against your project.

Remove the disposable Auth users after successful tests if no longer needed. Deleting an Auth user cascades deletion of that user's `reset_progress` row.

## 5. Build and manually test the real integration

```sh
node --test tests/sync.test.js
npm run build
npm run preview -- --host localhost --port 4173 --strictPort
```

Open the printed preview URL. Accept the PWA's **Update & reload** prompt after saving any unfinished form entries. Different origins/ports have separate local data; do not expect existing data from 5173 to appear on 4173.

1. With no configured environment, confirm Account / Sync says syncing is not configured. The tracker and moods must still save/reload locally.
2. With configuration, open **Account / Sync**, enter your email, request the magic link, and open it in the same browser. Confirm no `reset_progress` record was created by sign-in.
3. Save a test journey and mood locally. Choose **Review local & cloud versions**. Check the fields, explicitly consent, and upload. Inspect the table: there must be no mood, journal, substance detail, or note columns/payloads.
4. In another browser/profile, sign into the same account. Review the cloud version and choose **Use cloud version**. Local data must not change just by logging in or reviewing.
5. Create a different local journey. Review both versions and test each explicit conflict choice. A local mood must survive importing cloud progress. Change cloud progress on another device after review; the stale upload must fail and request another review.
6. Go offline after the PWA has cached the app. Save a goal and check-in, reload, and verify persistence. Account actions are disabled; reconnecting must not automatically upload. Review again when online.
7. Sign out: local progress and moods remain. This ends this browser's Auth session, not other devices. Signing out requires connectivity. Account removal is separate from sign-out.
8. Test **Delete cloud journey only**, both Cancel and Confirm. It must preserve local data and the Auth account. Nothing automatically re-uploads. Test **Delete local data**, both Cancel and Confirm: it must preserve cloud data, the Auth session, and the cached app.
9. In two different test accounts, confirm the API/UI cannot read or modify the other's records. Check DevTools Network only with test data; don't copy access tokens or personal responses into reports.

## Privacy / operating limits

- Sync is intentionally manual, not background or automatic bidirectional syncing. Each upload requires a new review and checkbox. The app never queues offline uploads or silently merges data.
- Goal categories can still reveal wellbeing information. Uploads go to the configured Supabase project and are associated with an email-based Auth account. Project administrators can access that data; RLS separates ordinary users, not administrators.
- Browser storage is not encrypted medical-record storage. Shared browsers, scripts executing on the origin, browser eviction, and clearing storage are relevant limitations. No cloud backups are made for moods.
- Service-worker caching covers only the public app shell/static assets. Supabase Auth and database responses are not cached by the worker. External support websites still need internet.
- Deleting a cloud row removes it from the live app table, not necessarily database backups/logs. Retention follows your Supabase project configuration. To delete the Auth identity/email as an administrator, use **Authentication → Users → selected user → Delete user**. That is distinct from the in-app cloud-journey deletion.
- Never deploy privileged browser keys. Keep RLS enabled. Re-run the SQL isolation tests after policy changes. Host production over HTTPS, and revalidate `sw.js`, `index.html`, and the manifest as described in `PWA-TESTING.md`.

## Validation completed here

Build and lint passed. Nine automated tests cover upload filtering, validation, offline blocking, database-verification gating, account identity, and revision-scoped writes/deletes. A guest Account / Sync render with credentials absent made zero network requests. A separate build with fake public configuration checks that the configured SDK path compiles; it does not connect to a real project. Live email delivery, actual RLS assertions, browser offline behavior, and multi-device sync remain manual checks because no configured database or connected browser was available.

References: [Supabase email passwordless Auth](https://supabase.com/docs/guides/auth/auth-email-passwordless), [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [Supabase JavaScript client](https://supabase.com/docs/reference/javascript/initializing).

## Auth-only manual test (no database migration needed)

The account action now has separate **Sign in to an existing account** and **Create account / confirm email** choices. Both use passwordless email links; there is no password form.

1. Use `http://localhost:5173/` consistently. In Supabase **Authentication → URL Configuration**, set the local Site URL to `http://localhost:5173` for this test and add `http://localhost:5173/?account=1` to Redirect URLs. The app computes that exact redirect from this origin. If using port 5174 instead, allowlist its exact URL too; storage and PKCE verification are port-specific.
2. Under **Authentication → Sign In / Providers → Email**, enable Email and email confirmations. Allow new-user registration for the create-account test. Under **Authentication → Email Templates**, retain the default confirmation links using `{{ .ConfirmationURL }}` for Confirm signup and Magic Link. Do not replace them with a token-hash callback requiring an unimplemented custom route. Check SMTP/test-recipient restrictions if mail is not delivered. Dashboard settings have not been verified from this workspace.
3. Before signing in, save a test journey and mood. Reload and confirm both remain. Visit Home, My Journey, Daily Check-in, Find Support, and The Campaign as a guest.
4. Open **Account / Sync**, choose **Create account / confirm email**, enter an email you control, and select **Send confirmation link**. No signed-in state should appear just from submitting the form. Open the newest confirmation email link in the same browser/profile and on the same device that requested it. Check spam if needed. Complete the email confirmation before expecting a signed-in session.
5. After returning to RESET, confirm **Signed in as …** appears. In Supabase **Authentication → Users**, check that the email is confirmed. Reload, close/reopen the tab, and reopen Account / Sync: the session should persist, subject to browser storage and session expiry.
6. Select **Sign out** while online. The account panel should return to guest mode; the saved journey and mood must remain after reload. Other devices are not signed out.
7. Choose **Sign in to an existing account**, enter the same email, and request a fresh link. Open it in the same browser. This mode explicitly prevents automatic account creation. Unknown addresses receive a generic response to avoid revealing account existence.
8. Test an expired/already-used link or open a PKCE link in a different browser. RESET should show a friendly error directing you to request a fresh link in that browser, without displaying callback details or tokens. Link lifetimes and reuse behavior depend on Supabase Auth settings.
9. Turn off the network after the production PWA has been cached. Guest features should still work; sign-in and sign-out require connectivity. Do not use the Vite dev server to test offline navigation.
10. Do not press **Review local & cloud versions**, upload, or run SQL for this Auth-only test. Auth does not require the progress table. Creating/confirming an account affects Supabase Auth only; no personal progress is uploaded by login.

Authentication review added initialization/callback error handling, callback URL cleanup, separate create/sign-in choices, safe provider-error messages, and session-loading guards. Automated tests use mocked Auth calls, not real email delivery. Live signup, confirmation, persistence, and sign-out still require the steps above; no email was sent on your behalf.
