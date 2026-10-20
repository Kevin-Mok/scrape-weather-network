# Scarborough browser scraper and Vercel feed

Implement a headless browser scraper, validate and atomically save its hourly feed, publish it to Vercel Blob, schedule half-hourly runs, and integrate the feed into the existing weather app.

## Scope and decisions
- Source: https://www.theweathernetwork.com/en/city/ca/ontario/scarborough/hourly
- Scraper is a new repository; initial directory contained only harness metadata and an empty .git.
- App source: ~/coding/weather. Clean baseline; isolated checkout: .worktrees/weather-app.
- Existing approved plan is the intent; this is already the fresh execution task. Do not recursively invoke metaprompt-run. Save the execution prompt for reuse.
- Default location object: name, postalCode M1E4V4, latitude 43.7729744, longitude -79.2576479, timezone America/Toronto.
- UTC fetchedAt; each hourly time includes its actual Toronto UTC offset. All available rows; null only for source-declared unavailability. Missing labels or malformed values fail extraction.
- Public Blob path weather/scarborough-hourly.json; 60-second cache; validate before local replace/publication. Keep tokens private.
- Preserve Open-Meteo current conditions and other locations. Fall back clearly after 90 minutes or on invalid/unavailable feed.

## Atomic implementation steps
- [x] Defining scraper/parser/publication tests RED, implementation GREEN.
- [x] Browser install; inspect actual DOM, expand all rows, compare screenshot/DOM/feed and coverage.
- [x] Explicit-path systemd user setup, 00/30 calendar, persistent timer, five-minute timeout.
- [x] Weather app tests RED, feed API/UI integration, tests/type/build GREEN.
- [x] Credentials, live Blob publication, timer activation and deployment verification.
- [x] README/setup/schema/recovery/smoke-test updates; independent review.

## Shared interface preflight
Scraper produces schemaVersion 1/source/sourceUrl/fetchedAt/location/hourly. App consumes identical field names, null semantics, offset timestamps and freshness. Both validate trust boundaries. Publication failure must retain prior local feed; browser always closes.

## Risks and blockers
- Resolved: pinned agent-browser installed; installed Chrome verified with its sandbox enabled.
- Resolved: Vercel device sign-in, public Blob and private token configuration completed; publication and production deployment verified.
- Local timer requires running machine; lingering needed for logged-out sessions.
- Original app directory outside sandbox write roots; implementation kept in isolated checkout.

## Evidence and review
Initial git probes exit 128; new repository initialized after inventory. See docs/postmortem/2026-10-20-execution-environment.md. No commit or deployment yet.

## Verified runtime evidence
- Defining parser tests observed Not implemented RED; parser GREEN 6/6. Publication/cleanup and systemd tests similarly observed RED, then full root suite GREEN 14/14. npm test exit0.
- Installed agent-browser 0.27.0 and @vercel/blob pinned in package-lock.json; audit0 vulnerabilities. Explicit /usr/bin/google-chrome verified sandboxed.
- Live CLI scrape and installed user service each extracted all 72 rows and published successfully. Service Result=success, ExecMainStatus=0, TimeoutStartUSec=5min.
- Public Blob https://28fsxfhxape7uoxc.public.blob.vercel-storage.com/weather/scarborough-hourly.json; token stored only mode600 private environment; WEATHER_BLOB_URL set in Vercel Production/Preview/Development.
- Timer enabled, 00/30 schedule observed, Linger=yes. systemd-analyze --user verify generated units exit0 with no output.
- Local API returned TWN source, currentSource open-meteo and all 12 requested rows identical to Blob in every field.
- Browser 1440x900:12 cards/four columns;390x844:12 cards/two columns; screenshots inspected; no document/card horizontal overflow. Default npm run dev preserved occupied port3000 and automatically selected3001.

## Review and rulings
- Independent review confirmed publication ordering, cleanup and timer design. Found two important app defects: half-hour timezone current-hour selection and one-shot dashboard fetch; tests reproduced both before fixes. Compass direction validation also aligned. Final app fix verification pending.
- Ruling: already running the fresh execution task, so do not recursively launch metaprompt-run; prompt saved and read back as requested. Cost if wrong: user can explicitly launch the saved prompt later.
- Ruling: use isolated app checkout and feature branch; preserve clean original main. Deployment will use the committed feature revision. Cost if wrong: branch needs a later merge into main.
- Ruling: systemd EnvironmentFile test expectation corrected to actual directive semantics after real parser warning. Cost if wrong: unit cannot load config; real service execution verified success.
- Rollback: disable timer; keep Blob while scraper is repaired; unset WEATHER_BLOB_URL and redeploy to restore Open-Meteo fallback. Original app main checkout preserved.
- README gate: update_in_same_change; truthful setup/schema/commands/recovery added before commit.

## Deployment evidence
- Feature app commit3d1c4d634f3b787c9dd08868aad76397472127fa pushed to https://github.com/Kevin-Mok/weather.git branch feat/scarborough-hourly.
- Vercel productiondpl_8ht63rZZzX5m3FHgq8UTGvrh2wVD READY; alias https://weather-kevinm.vercel.app. Deployment gitCommitSha matches feature HEAD exactly.
- Production12-hour API matches every Blob field and recent fetchedAt, reports hourlySource the-weather-network/currentSource open-meteo. Live mobile 12 cards/two columns and desktop 12 cards/four columns have no overflow.
- Final app review regressions36 route+4 refresh cases pass; typecheck/build pass. Final scraper15/15 pass, including prefixed feels-like unavailable marker.
- refresh-config attempted, blocked by unrelated pre-existing ~/.config/mimeapps.list change; preserved without forced overwrite.
- Remaining: commit release documentation, deploy that documentation revision, final status/commit scraper.

## Final milestone: feat: scrape Scarborough hourly forecasts

- Scraper source, tests, setup tooling, systemd templates, README, smoke tests, saved prompt, postmortem and this plan ready for the same commit. No unrelated files included.
- App source commit3d1c4d6 and release-documentation commit4499917 pushed to ssh/feat/scarborough-hourly. Final productiondpl_H8LvPFqKifFmqMk7c5cmR5dfVMBf READY; Vercel API gitCommitSha449991765984fd8281d687bcf045e10adfefd1e4 exactly matches current app HEAD.
- Final plan acceptance requests all pass: installed service start exit0; timer reports last16:30/next17:00; production1-hour API reports the-weather-network, fetchedAt2026-10-20T20:38:37.173Z, Toronto-offset hour and every requested metric, including precipProb0.
- Other-location production request for Kolkata returned open-meteo with +05:30 and the current local hour.
- Canonical postmortem ledger and guidance updated directly; targeted checks on all3 report aliases pass with no errors/new/changed/unregistered sources. Unrelated pre-existing linux-config edits remain unstaged and preserved; learning edits remain in that already-dirty checkout.
- Full root suite15/15; app36 route+4 refresh cases, typecheck/build and remote production build pass. Source and deployed desktop/mobile checks pass.
- Source implementation and deployment complete. No merge to main was requested; feature branch preserved. Scraper repository has no remote, so its commit remains local.
- Remaining non-product issue: refresh-config stopped safely at pre-existing ~/.config/mimeapps.list conflict; no forced overwrite.
- No deferred review findings remain; the small compass validation note was fixed alongside the important review regressions.
