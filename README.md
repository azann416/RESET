# RESET

RESET is a Toronto-focused, mobile-friendly harm-reduction and wellbeing app. Guest use, local Journey tracking, local-only mood check-ins, and offline app-shell support work without an account.

## Run and verify locally

```sh
npm install
npm run dev
npm run build
npm run lint
node --test tests/*.test.js
```

To check offline behavior, build and run `npm run preview`; the PWA service worker is intentionally disabled in Vite development mode.

## Break the Stigma

Open the **Learn** view from the Home page or navigate directly to `/#learn`. The five-question awareness activity provides sourced feedback and an optional static `#MyResetJourney` campaign message. Answers are not saved or uploaded. Completion and the digital keychain unlock are stored locally under `reset.stigma.completed.v1` and `reset.stigma.keychain.v1`; they do not alter the Journey and check-in record at `reset.wellbeing.v1`. The keychain is a digital collectible, not a physical reward.

## The Movement

Open **Movement** from the app navigation or go directly to `/#movement`. Visitors can take the quiz, explore a stigma-free language guide, or make a shareable campaign graphic. The graphic generator exports preset campaign messages as 1080px PNGs in portrait-post and story formats, with an optional fixed caption. Neither exports nor captions include tracker data, quiz answers, or check-ins. Awareness milestones use the separate local-only key `reset.movement.milestones.v1`; no account or sharing is required.

The Movement also includes **Spread the Word**, a small media kit with three downloadable portrait posters and copyable, privacy-conscious social captions. The **About This Campaign** section explains RESET and links directly to the quiz, graphics, Support, and optional tracker.

## Rewards

Open **Rewards** from the app navigation, Home, or The Movement, or go directly to `/#rewards`. The collection derives unlocks from local campaign activity: visit The Movement for **Start Somewhere**; complete the existing quiz for **Break the Stigma**; complete any two of the quiz, language guide, and campaign-graphic download for **Keep Showing Up**; and explore the campaign-card activity for **Spread the Love**. No social post or personal disclosure is needed. Campaign visit/share exploration and dismissed unlock reveals use new local-only `reset.rewards.activities.v1` and `reset.rewards.seen.v1` keys. Keychain PNGs contain only preset campaign art.

## Deploy with Vercel

Import this Git repository in Vercel. Use the **Vite** framework preset, repository root as the project root, `npm run build` as the build command, and `dist` as the output directory. Vercel's default install command (`npm install`) is sufficient. No `vercel.json` rewrite is needed: app views use URL hashes such as `/#journey`, which are handled in the browser.

Guest use requires no environment variables. Leave Supabase variables unset until the live Supabase schema, RLS, ownership isolation, and sync verification tests have been confirmed. To enable optional sync afterward, configure the public variables and explicit opt-in described in [SUPABASE-SETUP.md](./SUPABASE-SETUP.md). Only use a Supabase publishable key in `VITE_` variables; never use a service-role or secret key in frontend code.

`.env.local` is ignored by Git and `.vercelignore` excludes local environment files from Vercel uploads. Vite `VITE_` values are compiled into public browser code; they must never contain secrets.
