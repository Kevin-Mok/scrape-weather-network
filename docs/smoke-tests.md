# Weather feed smoke tests

Verify extraction, publication and scheduling first, then inspect the dashboard at desktop and phone sizes. Compare the source and public feed within the same forecast update; source values can change between visits.

## Scraper and publication

- Action: Run `npm run scrape -- --local` with the verified Chrome executable configured, and open the source hourly page in vertical layout.
  Expected: The complete source count is saved, currently 72 rows. Compare first, midnight and final rows across all nine fields. Zero precipitation and negative temperatures remain numeric; explicit unavailable fields are null.
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
