# Weather feed smoke tests

Verify extraction, publication and scheduling first, then inspect the dashboard at desktop and phone sizes. Compare the source and public feed within the same forecast update; source values can change between visits.

## Scraper and publication

- Action: Run `npm run scrape -- --local` with the verified Chrome executable configured, and open the source hourly page in vertical layout.
  Expected: Chrome passes its sandbox check; all structured and rendered values agree, source generation is recent, and the complete advertised count is saved, currently 72 rows. Compare first, midnight and final rows across all nine fields. Zero precipitation and negative temperatures remain numeric; explicit unavailable fields are null.
- Action: Run `systemctl --user start scrape-weather.service`, inspect its journal and open the public Blob URL after up to 60 seconds.
  Expected: The service reports validated coverage, successful publication and local save; Blob metadata has the new fetchedAt. The journal has ongoing progress during slow phases.
- Action: Run `systemctl --user list-timers --all scrape-weather.timer` and `loginctl show-user "$USER" -p Linger`.
  Expected: Timer has a next run on minute 00 or 30 and Linger=yes. The service has a five-minute timeout and explicit executable paths.
- Action: Inspect the generated unit files with `npm run setup -- --render-only data/units` and systemd-analyze.
  Expected: Unit verification produces no path/quoting warnings; no timer is activated by render-only mode.

- Action: Run `npm run scrape -- --local`, inspect `data/weather-conditions.json`, then run another update (or start the installed service).
  Expected: A sorted JSON array contains each distinct non-null condition in the forecast. Names from previous updates remain even when absent from the latest forecast; repeated names appear only once. The CLI prints the catalog path. With `--output`, check beside that output instead.

## Dashboard

- Action: Open the dashboard and request its API for M1E4V4 with the fixed Scarborough coordinates.
  Expected: Hourly source is The Weather Network, fetchedAt is recent, every requested field is present and agrees with the Blob. Current conditions remain labeled Open-Meteo.
- Action: Inspect 1440×900 and 390×844, then scroll mobile to the final card.
  Expected: Twelve cards, desktop four columns and mobile two columns. All values fit, no horizontal overflow, source/fetched labels readable, midnight dates and UTC offsets visible.
- Action: Request a different city/coordinates and a half-hour timezone.
  Expected: Hourly source remains Open-Meteo, the location is not replaced by Scarborough, and the current local hour is retained.
- Action: In a disposable local environment, omit WEATHER_BLOB_URL or point it to a stale/malformed fixture, then refresh.
  Expected: A clear Open-Meteo fallback reason appears; malformed rows are never rendered as a valid TWN forecast. Restore the real variable after checking.

## Verification evidence

2026-10-20: Parsed 72 real expanded rows; local API matched the public Blob across every field for twelve hours. The systemd service completed with successful publication and save; timer and lingering activated. Mobile screenshot at 390×844 showed readable metrics, twelve cards and no horizontal overflow. Desktop 1440×900 and deployed API/browser checks also passed; revision details are in the execution plan.


## Browser comparison and trial

- Action: Run `npm run test:browser` on a host with sandboxed system Chrome.
  Expected: The local cacheable cookie-redirect fixture first fails with excessive redirects; the adapter reaches the normal URL after disabling its active target cache. No TWN or Blob access occurs.
- Action: Run `npm run compare`, then `npm run compare -- --cache-disabled`; inspect the ignored reports under `data/diagnostics`.
  Expected: Both controllers use system Chrome with sandboxing enabled. Failure reports preserve sanitized redirect/cookie metadata; successful reports show every advertised row, UTC/Toronto coverage and source generation, with full structured/DOM agreement. Cookie/header/query values are absent. Both repaired controllers passing supports retaining agent-browser.
- Action: Run `npm run setup:trial -- --render-only data/trial-units`, then inspect the generated files.
  Expected: Separate `scrape-weather-trial` units reference this checkout's trial script, never load credentials, run at00/30, and retain the300-second timeout. Render-only does not activate timers.
- Action: After installing the trial timer, start `scrape-weather-trial.service` and run `npm run trial -- --status`; inspect its journal and `data/trial`.
  Expected: One attempt records complete coverage, generation, timings and sanitized diagnostics without changing the public Blob. Interrupted attempts count as failures; missed slots remain separate. After48 attempts no further browser is opened. Acceptance requires48 successful consecutive half-hour slots below300seconds; production remains unchanged until explicit promotion.

- Action: After a failed or interrupted trial, run `npm run trial -- --status` and open the corresponding `data/trial/postmortem-NN.md`.
  Expected: Each failed attempt has its own sanitized report and linked run evidence; a later success never removes or hides it. Use the saved GPT Online prompt with these reviewed summaries when comparing alternatives.

- Action: Inspect a new coverage or source-agreement failure summary after a scheduled run.
  Expected: The report includes only safe source UTC-window/count evidence or the first differing row/field. A too-far-ahead start still rejects publication. Previously written failure reports remain byte-for-byte unchanged.


## Restored publishing service

- Action: Run `npm run setup` from the repaired worktree, start `scrape-weather.service`, then inspect its result and timer.
  Expected: ServiceResult=success/ExecMainStatus=0, ExecStart references this checkout, next run at00/30, five-minute timeout. The original private environment remains unchanged; no separate cron is required.
- Action: After up to60seconds, open the public dashboard and request its default12-hour API.
  Expected: The Weather Network source, recent fetchedAt, no hourly fallback, all12rows match Blob fields; current conditions stay Open-Meteo. Existing accumulated condition names remain in the local catalog.
- Action: Inspect the journal after any failed publishing invocation, or the next invocation after a process kill.
  Expected: A separate sanitized postmortem path is printed under data/failures. Interrupted or possibly published outcomes are explicit; old evidence is never overwritten. Preserve publication-pending.json on malformed-state errors.
