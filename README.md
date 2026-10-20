# Scarborough hourly weather feed

A small browser-to-dashboard pipeline for checking Scarborough forecasts without losing the details visible on The Weather Network. It extracts every available hourly row, validates the complete forecast, publishes a public JSON feed, and refreshes it twice an hour through a systemd user timer. The accompanying weather dashboard consumes that feed while keeping its sources and fallback state visible.

## Tech Stack And Why Chosen

- Node.js 22 and the standard library: parsing, strict validation, atomic file replacement, tests and setup without an application framework.
- Pinned `agent-browser`: headless Chrome extracts the rendered page rather than assuming undocumented forecast API fields.
- `@vercel/blob`: one stable public URL, authenticated writes, and a 60-second cache lifetime.
- systemd user units: calendar scheduling, missed-run recovery, bounded runtime and journal logs.
- Existing Next.js dashboard: maintains its dark responsive cards and Open-Meteo current conditions.

## Pipeline and files

`The Weather Network → agent-browser → validation → Vercel Blob → weather API → dashboard`

- [Execution plan](plans/scarborough-hourly.md), [saved execution prompt](prompts/scrape-scarborough-hourly.md), [manual smoke checks](docs/smoke-tests.md).
- `src/feed.mjs`: parser and feed contract; `src/dom.mjs`: rendered-row extraction.
- `src/browser.mjs`: isolated headless session, readiness checks and cleanup.
- `src/publication.mjs`: validates, stages a file, publishes, then atomically replaces local output.
- `systemd/`: service and timer templates; `scripts/setup.mjs`: installs concrete absolute paths.
- The weather app is maintained in its own repository, `~/coding/weather`. This execution's isolated checkout is `.worktrees/weather-app` (ignored here).

## Installation

Run from this repository. No sudo is normally needed. Install Node.js 22 or newer and a working Chrome browser, then install the pinned dependencies:

npm ci

The browser package can download Chrome with `node_modules/.bin/agent-browser install`. On the verified host, `/usr/bin/google-chrome` works with its sandbox enabled; downloaded Playwright Chromium cannot initialize its sandbox. Set `AGENT_BROWSER_EXECUTABLE_PATH` to the Chrome executable you have verified. Do not disable the browser sandbox to work around installation issues.

Try a local-only scrape before configuring publication:

npm run scrape -- --local

## Private credentials and shared storage

Create a **public** Vercel Blob store connected to the existing `weather-kevinm` project using the Vercel CLI or dashboard. Store its `BLOB_READ_WRITE_TOKEN` only in `~/.config/scrape-weather/env`, with file permissions `600` and a private parent directory. The shape is shown in [.env.example](.env.example); replace the placeholder using a local editor. Never put the token in source control, shell history, the browser bundle or `NEXT_PUBLIC_*` variables.

The private environment also sets `AGENT_BROWSER_EXECUTABLE_PATH=/usr/bin/google-chrome` on the verified host. `npm run setup` can create the file from an already set `BLOB_READ_WRITE_TOKEN` environment variable if the file does not exist. It preserves an existing file and rejects broad permissions.

Publication overwrites `weather/scarborough-hourly.json` with public access, no random suffix, `allowOverwrite: true`, JSON content type and `cacheControlMaxAge: 60`. Anyone with the URL can read the forecast. Only the local scraper needs the write token; the weather app reads through `WEATHER_BLOB_URL`. Set that variable in Production, Preview and Development, then deploy the app. [Vercel documents overwrite propagation of up to 60 seconds](https://vercel.com/docs/vercel-blob/public-storage).

Current public feed:
https://28fsxfhxape7uoxc.public.blob.vercel-storage.com/weather/scarborough-hourly.json

## Scheduler setup and operation

Install and enable the user timer once the private environment is ready:

npm run setup

The setup installs `scrape-weather.service` and `scrape-weather.timer` under `~/.config/systemd/user`, uses absolute Node/CLI paths, adds the Node directory to PATH, enables the timer and enables lingering when needed. It does not replace other listeners or stop unrelated services. Lingering can require administrator authorization on some hosts; the setup reports the failure if policy denies it.

The timer runs at minutes **00 and 30** in the machine's local timezone, with `Persistent=true` to catch a missed calendar run after startup. It does not replay every missed half hour. The service has a **300-second timeout**, restrictive file creation permissions and control-group cleanup. The machine must be running for local scraping to happen.

Run and inspect the service:

systemctl --user start scrape-weather.service

systemctl --user list-timers --all scrape-weather.timer

journalctl --user -u scrape-weather.service -n 30 --no-pager

## Command reference

- `npm run scrape -- --local`: extract and save without Blob publication.
- `npm run scrape`: extract, publish and atomically save; requires the token in the process environment. The installed service loads the private environment automatically.
- `--output PATH`: override local output, default `data/scarborough-hourly.json` resolved relative to this repository.
- `--plain`: ASCII status messages. `CLI_PLAIN=1` also applies to the scraper.
- `--details`: include diagnostic causes on failure. Progress is sent to stderr every 15 seconds during slow phases.
- `--help`: print scraper usage without opening a browser.
- `npm run setup -- --env-file PATH`: install with an alternate private environment file.
- `npm run setup -- --render-only DIR`: write concrete unit files for review without credentials or activation.
- `npm run setup -- --plain`: ASCII setup messages.
- `npm test`: built-in Node test runner. `node --experimental-test-isolation=none --test` shows individual cases on Node 22 when isolated output is collapsed.

## Observed weather conditions

Each successful update (local or scheduled publication) merges every non-null hourly condition into `data/weather-conditions.json`. This sorted JSON array keeps exact source names, removes duplicates, and retains names absent from the latest forecast. With `--output PATH`, the catalog lives beside that output. `weather-conditions.json` is reserved and cannot be the forecast output filename.

Use this growing list to find or generate an image for each observed weather type. It is not an exhaustive source dictionary: rare conditions appear only after they are scraped. No images are generated automatically. The catalog stays local and the public forecast schema is unchanged.

Inspect the list with `cat data/weather-conditions.json`. Back it up with your local data: `data/` is ignored by Git, so deleting it loses the accumulated history. A malformed catalog stops publication with a repair/restore error instead of silently resetting the list. Temporary files are synced before atomic replacement; failed publication preserves both the previous forecast and catalog. Remote publication, catalog replacement and forecast replacement are separate operations, so a disk failure after publication can leave them at different updates. Run one scraper at a time; the systemd service already serializes scheduled runs.

## JSON contract

The top-level object is `{schemaVersion, source, sourceUrl, fetchedAt, location, hourly}`. Version is `1`, source is `the-weather-network`, and `sourceUrl` is the Scarborough hourly page. `fetchedAt` is an ISO UTC timestamp after extraction. `location` has `name`, `postalCode`, `latitude`, `longitude`, and `timezone` (`America/Toronto`), fixed to the dashboard's Scarborough location.

| Hourly field | Value |
| --- | --- |
| `time` | Dated Toronto hour, e.g. `2026-10-20T17:00:00-04:00` |
| `temp`, `feelsLike` | Celsius numbers, including zero and negatives |
| `condition` | Source condition text |
| `windSpeed`, `windGust` | km/h numbers |
| `windDirection` | Compass abbreviation or `VRB` |
| `humidity`, `precipProb` | Percentage numbers from 0 through 100 |

Each value except `time` can be `null` only when the source explicitly declares it unavailable. Missing elements, blank text, unknown units, malformed values, mismatched timestamps or incomplete row coverage fail the scrape. Zero is never treated as unavailable. The vertical layout renders all rows expanded; structured page timestamps supply the dates and are cross-checked against rendered hour labels. UTC offsets are validated against Toronto rules; repeated autumn hours remain distinct, and nonexistent spring hours fail.

The app exposes `hourlySource`, `hourlyFetchedAt`, `hourlyFallbackReason` and `currentSource`. The fixed Scarborough request uses the feed when valid and no older than 90 minutes. It falls back visibly to Open-Meteo when unconfigured, unavailable, invalid, stale, or lacking requested near-term coverage. Other locations continue to use Open-Meteo. Current conditions are separately identified as Open-Meteo; precipitation amount is not fabricated for scraped rows.

## Recovery and rollback

If extraction or publication fails, the service exits unsuccessfully and the prior local JSON remains. A candidate file is removed on handled failure; successful local replacement uses a same-directory rename. Remote publication and local rename are not a distributed transaction: a successful remote write followed by a local disk failure can leave the public feed newer than the local copy. Rerun after fixing disk or network errors.

Check the journal, run the scraper with `--local --details`, verify the source's layout and units, then restart the service. Do not publish a partial forecast to conceal a selector failure. Page-load timeouts are accepted only when the browser reached the exact source URL and the complete rendered forecast passes readiness and coverage checks. All other browser errors fail safely.

To stop scheduled refreshes, use `systemctl --user disable --now scrape-weather.timer`. Keep the previous Blob while repairing the scraper; the app will label stale fallback after 90 minutes. Unsetting `WEATHER_BLOB_URL` and redeploying restores Open-Meteo hourly fallback. Re-run setup after moving the repository or changing Node installation paths.
