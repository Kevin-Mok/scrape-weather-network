# Scarborough hourly weather feed

A small browser-to-dashboard pipeline for checking Scarborough forecasts without losing the details visible on The Weather Network. It extracts every available hourly row, validates the complete forecast, publishes a public JSON feed, and refreshes it twice an hour through a systemd user timer. The accompanying weather dashboard consumes that feed while keeping its sources and fallback state visible.

## Tech Stack And Why Chosen

- Node.js 22 and the standard library: parsing, strict validation, atomic file replacement, tests and setup without an application framework.
- Pinned `agent-browser`: existing headless navigation and DOM extraction. Pinned `playwright-core`: direct same-host control and CDP cache configuration, using installed sandboxed Chrome without downloading another browser.
- `@vercel/blob`: one stable public URL, authenticated writes, and a 60-second cache lifetime.
- systemd user units: calendar scheduling, missed-run recovery, bounded runtime and journal logs.
- Existing Next.js dashboard: maintains its dark responsive cards and Open-Meteo current conditions.

## Pipeline and files

`The Weather Network → agent-browser → validation → Vercel Blob → weather API → dashboard`

- [Execution plan](plans/scarborough-hourly.md), [saved execution prompt](prompts/scrape-scarborough-hourly.md), [manual smoke checks](docs/smoke-tests.md).
- `src/feed.mjs`: parser and feed contract; `src/dom.mjs`: rendered-row extraction; `src/structured.mjs`: JSON-only hydration parsing with UTC timestamps, units, location and generation freshness checks.
- `src/browser.mjs`: isolated sandbox-verified headless session, cache configuration, structured/DOM agreement, readiness checks and cleanup.
- `src/publication.mjs`: validates, stages a file, publishes, then atomically replaces local output.
- `systemd/`: service and timer templates; `scripts/setup.mjs`: installs concrete absolute paths.
- The weather app is maintained in its own repository, `~/coding/weather`. This execution's isolated checkout is `.worktrees/weather-app` (ignored here).

## Installation

Run from this repository. No sudo is normally needed. Install Node.js 22 or newer and a working Chrome browser, then install the pinned dependencies:

npm ci

Recurring scraping and public redistribution require the source owner’s written permission. The operator confirmed permission for this installation; do not assume it transfers to other uses.

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

Each value except `time` can be `null` only when the source explicitly declares it unavailable. Missing elements, blank text, unknown units, malformed values, mismatched timestamps or incomplete row coverage fail the scrape. Zero is never treated as unavailable. The vertical layout renders all rows expanded. JSON-LD advertises coverage and named columns; hydration supplies source UTC/local times, numeric values, units and generation time. Both are parsed as data, without executing inline scripts or resolving opaque React IDs. Every hydrated record must agree with the rendered DOM. Missing metadata, nonmatching rows, or source generation older than 90 minutes (or in the future) reject the entire update before publication. A new fetchedAt never hides stale source generation. These website internals can change and will then fail closed. UTC offsets are validated against Toronto rules; repeated autumn hours remain distinct, and nonexistent spring hours fail.

The app exposes `hourlySource`, `hourlyFetchedAt`, `hourlyFallbackReason` and `currentSource`. The fixed Scarborough request uses the feed when valid and no older than 90 minutes. It falls back visibly to Open-Meteo when unconfigured, unavailable, invalid, stale, or lacking requested near-term coverage. Other locations continue to use Open-Meteo. Current conditions are separately identified as Open-Meteo; precipitation amount is not fabricated for scraped rows.

## Recovery and rollback

If extraction or publication fails, the service exits unsuccessfully and the prior local JSON remains. A candidate file is removed on handled failure; successful local replacement uses a same-directory rename. Remote publication and local rename are not a distributed transaction: a successful remote write followed by a local disk failure can leave the public feed newer than the local copy. Rerun after fixing disk or network errors.

Check the journal, run the scraper with `--local --details`, verify the source's layout and units, then restart the service. Do not publish a partial forecast to conceal a selector failure. Page-load timeouts are accepted only when the browser reached the exact source URL and the complete rendered forecast passes readiness and coverage checks. All other browser errors fail safely.

To stop scheduled refreshes, use `systemctl --user disable --now scrape-weather.timer`. Keep the previous Blob while repairing the scraper; the app will label stale fallback after 90 minutes. Unsetting `WEATHER_BLOB_URL` and redeploying restores Open-Meteo hourly fallback. Re-run setup after moving the repository or changing Node installation paths.


## Redirect diagnosis and nonpublishing trial

Use the [comparison plan](plans/playwright-diagnostics.md) to reproduce the same-host experiment and inspect diagnostics. At the operator’s subsequent request, the publishing timer now runs the repaired `.worktrees/playwright-diagnostics` checkout. The separate failed trial remains unaccepted and continues collecting evidence; operational restoration does not establish 48/48 reliability.

On October 29 both unmodified controllers hit the same issuance redirect loop on Chrome 156. Disabling only Chrome's HTTP cache restored the normal exact URL and complete extraction. The repaired native adapter checks `chrome://sandbox`, attaches Playwright CDP to that active target, and disables its cache before navigation. It retains the native controller and the exact-URL timeout/readiness checks. No issuance URL is hard-coded and no browser sandbox is disabled. This is a verified client-side workaround for cacheable server redirects, not proof of an upstream fix.

Run the controlled pair with default caching (a failed comparison still writes both reports):

npm run compare

Run the repaired pair:

npm run compare -- --cache-disabled

`compare` uses clean separate ordinary profile directories, `/usr/bin/google-chrome`, headless mode and sandbox verification. Options: `--cache-disabled`, `--output DIR` (default `data/diagnostics`), `--plain`, `--help`. Reports include versions, argument names, sandbox status, sanitized document chains, cookie names/attributes/blocking reasons and extraction timing/coverage/generation. URL query values, cookie values and raw headers are excluded at collection. Reports, forecast samples and profiles are never committed. Direct Playwright waits for DOMContentLoaded while native navigation waits for load; timings do not establish controller-only speed gains.

Run the local sandboxed cookie-redirect reproducer (no TWN access):

npm run test:browser

Install the separate trial timer from this worktree, without loading Blob credentials or modifying the production units:

npm run setup:trial

Start one serialized trial immediately:

systemctl --user start scrape-weather-trial.service

Read its saved status without opening Chrome:

npm run trial -- --status

`trial` supports `--status`, `--plain` and `--help`. `setup:trial` supports `--render-only DIR`, `--plain` and `--help`. Trial units run at minutes 00/30 with Persistent=true, a 300-second service timeout and UMask0077. Keep this worktree and its Node installation present while units refer to them. Existing user lingering must be enabled for logged-out execution. Only systemd should launch trial attempts, so simultaneous manual invocations cannot race the state file.

Each attempt saves pending state before opening a fresh process/browser, then records success/failure, elapsed/navigation/extraction times, count, UTC/Toronto endpoints and generation time in ignored `data/trial`. Interrupted attempts count as failures; missing half-hour slots are separate. No retries are performed or hidden. After 48 attempts, further timer invocations perform no browser access. The acceptance gate is 48/48 valid first attempts in distinct consecutive half-hour slots, no interrupted/missing runs, and every duration below 300 seconds. This short trial does not span the November 1 DST transition; extend observation separately. No automatic promotion occurs.

To install or restore the publishing scheduler, run the existing `npm run setup` from the desired checkout, then start `scrape-weather.service`. Setup preserves the private environment, installs absolute paths, enables the 00/30 timer and lingering. The October 29 restoration copied the original last-good feed and accumulated condition catalog before the first repaired publication; all historical condition names were retained. Fresh validated data now reaches the same public Blob URL and Vercel dashboard; no redeployment or Vercel cron is needed for each update. A bad extraction still fails without refreshing old timestamps.

Stop the trial timer when finished:

systemctl --user disable --now scrape-weather-trial.timer

To roll back the service path, run `npm run setup` from the original checkout (its old browser behavior may still fail). The prior unit files are also preserved in ignored `data/units-before-activation/`. Retain the last-good feed unchanged. Back up `data/trial` before removing this worktree; malformed trial state fails with a restore error rather than silently resetting measurement history.

Failed and interrupted attempts receive separate sanitized `data/trial/postmortem-NN.md` reports. Preserve them, including failed cohorts. Use the [GPT Online investigation prompt](prompts/weather-browser-investigation.md) with reviewed reports if remaining failures need outside analysis; never upload credentials or raw traces. The [first scheduled failure](docs/postmortem/2026-10-29-trial-attempt-01.md) remains unresolved even though the next run passed.

Failure reports now distinguish DOM evaluation, inline-script retrieval and validation stages. Safe source-window evidence includes checked/generated UTC times, allowed current/next start hours, source endpoints and advertised/hydration/rendered counts. Agreement failures name only the first differing row and field. A before-hour forecast rollover remains an unconfirmed hypothesis for the first failure; coverage validation is unchanged. Resume using [trial progress](plans/weather-trial/progress.md).


## Publishing failure evidence

The installed publishing service now records failures as well as the separate trial. A handled scrape/publication failure writes `data/failures/<start-epoch>-<pid>/postmortem-01.md` and a sanitized `run-01.json`, then reports the path in its journal. The report distinguishes an extraction failure from a publication attempt whose remote outcome may be uncertain. The private token is never copied into diagnostics.

Before starting, the CLI atomically creates `data/publication-pending.json`. A process kill or systemd timeout leaves it behind; the next invocation preserves an INTERRUPTED report before proceeding. Its duration includes elapsed downtime, so it is an upper bound rather than measured active runtime. Malformed/conflicting pending state stops with an inspect/restore error instead of discarding evidence. Run publishing through the serialized systemd service; do not run a second publishing CLI in parallel.

For a fresh update now, start the installed service:

systemctl --user start scrape-weather.service

For its schedule, inspect the existing timer:

systemctl --user list-timers --all scrape-weather.timer

Allow up to 60 seconds for Blob propagation, then reload https://weather-kevinm.vercel.app/. It should display The Weather Network and a recent fetched timestamp; current conditions remain Open-Meteo. The computer must be running and online. Keep this worktree and its pinned Node installation present while the service references them. No language-model session is needed for scheduled scrapes.
