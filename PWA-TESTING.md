# RESET offline / installation checks

The existing root app is the PWA. The nested `reset/` project is unrelated.

## Run the production version

```sh
npm run build
npm run preview -- --host localhost --port 4173 --strictPort
```

Open http://localhost:4173. Service workers are intentionally disabled in `npm run dev`.

## Browser acceptance checks (Chrome or Edge desktop)

1. Connect to the internet, open the production preview, and wait for “RESET is saved for offline use” near the footer.
2. DevTools → Application → Manifest: check RESET, standalone display, and valid 192/512 icons. Application → Service Workers: confirm `/sw.js` is activated. Reload once online if the current page is not yet controlled.
3. Save a test goal/start date and today’s mood. Reload and verify both persist. A start date of today must show 0 elapsed journey days.
4. DevTools → Network → Offline (or Application → Service Workers → Offline). Keep “Bypass for network” off. Reload normally. Check all five sections, illustration, icons, and styles. Change the goal and mood offline, save, reload, and check persistence.
5. Check the offline status message. External support websites require a connection; RESET only caches its own support descriptions and links.
6. Reconnect. If offered, use Install RESET. Otherwise follow the browser-menu guidance. Launch the installed app and repeat the offline checks.
7. Using test data, choose Delete my data, cancel and check that data remains. Then confirm deletion and reload. The journey and check-in should be empty, but the cached app should still open offline.
8. Check keyboard navigation, narrow screens, and reduced-motion settings. Confirm installation details and update controls are keyboard accessible.

## Update checks

Keep the preview tab open. Make a small visible text change, run `npm run build` again, and return to the tab while online (or click Check for updates). Wait for “A fresh version of RESET is ready.” Save any form changes, then choose Update & reload. Verify the new content and saved data. Repeat the offline reload. Revert the test text and rebuild afterward.

Updates are checked at registration, reconnect, returning to the tab, and hourly while visible. A new worker waits until accepted or all old tabs close. Accepting an update can reload other RESET tabs; unsaved form edits can be lost. Saved localStorage data is not changed by updates. Old precache entries are cleaned during activation. No third-party runtime caching is enabled.

## Hosting and data boundaries

- Deploy the complete `dist/` output at the origin root over HTTPS. This manifest is configured for `/`, not a subdirectory. Localhost is suitable for desktop testing; plain HTTP over a phone's LAN address is not sufficient for PWA installation.
- Serve `sw.js`, `index.html`, and `manifest.webmanifest` with revalidation (`Cache-Control: no-cache`), not immutable long-lived caching. Hashed `assets/` files can use immutable caching. Serve `sw.js` as JavaScript without SPA fallback rewriting.
- The first successful online download is required. Offline use depends on the browser retaining the installed service worker and cache. Browser eviction, private browsing, or clearing site data can remove them.
- localStorage key `reset.wellbeing.v1` is unchanged. Only the selected goal, starting date, and latest check-in are stored. Accounts and manual journey syncing are optional; see SUPABASE-SETUP.md. Moods remain local. Data belongs to a browser/origin; localhost:5173 and localhost:4173 have separate data. Installing or switching browser contexts may also use separate storage. No automatic migration is performed.
- navigator.onLine is a browser connection hint, not proof that every website is reachable.
- Delete my data removes only RESET's personal-data key. It intentionally preserves app caches, installation, and unrelated browser data.

## Verification performed

Production build and lint pass. HTTP checks confirm the production HTML, manifest, JavaScript registration code, service worker, and all generated precache URLs are served. PNG dimensions are verified at 180, 192, and 512 pixels. The original icon was visually inspected. A connected browser was unavailable, so actual worker activation, installation, offline navigation, and update lifecycle still need the browser acceptance checks above.
