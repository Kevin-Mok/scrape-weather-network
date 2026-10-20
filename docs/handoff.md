# Scarborough feed handoff

The scraper publishes every available hourly row to the public Blob, and the weather dashboard reads it for Scarborough while identifying Open-Meteo current conditions and fallback. Use this record to inspect the implementation, repeat runtime checks, or continue maintenance.

## Atomic plan and locations
- Scraper/units/publication: ~/coding/scrape-weather on feat/scarborough-hourly.
- App: ~/coding/scrape-weather/.worktrees/weather-app on feat/scarborough-hourly; original ~/coding/weather main is untouched.
- Decision-complete plan: ../plans/scarborough-hourly.md. Saved prompt: ../prompts/scrape-scarborough-hourly.md.
- Private timer environment: ~/.config/scrape-weather/env, mode600. Never copy its token into prompts or source control.

## Automated verification
- Scraper: npm test, and node --experimental-test-isolation=none --test:15/15. Tests were observed RED before implementation.
- App: npm test (36 route cases plus4 refresh lifecycle cases), npm run typecheck, npm run build: all pass. Node MockTimers prints an experimental API warning only.
- systemd-analyze --user verify generated service and timer: exit0, no output.
- git diff --check and staged checks: no errors.

## Manual verification
- Headless agent-browser extracted72 rendered rows; source screenshot and saved72-row fixture reviewed. Compare first/evening/midnight/final fields while accounting for source forecast updates.
- Service run successful: publishes and atomically saves; Result=success,ExecMainStatus=0; timeout 5min. Persistent timer00/30 active;Linger=yes. Scheduled16:30 run refreshed public Blob.
- Local API returns TWN hourly source, Open-Meteo current source and12 rows matching Blob for every field.
- Browser 1440x900:12 cards/four columns;390x844:12 cards/two columns; no horizontal overflow; all values readable. Three real API requests observed on open page demonstrate recurring refresh.
- npm run dev automatically tried3001 when3000 was occupied, preserving the existing listener.
- Production endpoint/deployment evidence is maintained in the execution plan.

## Documentation and review
Updated README, schema, private credentials, setup, commands, recovery, smoke tests, matching plans and engineering lessons in each repository. Independent review found half-hour-zone hour selection and missing open-tab refresh; both were reproduced RED, fixed and verified GREEN. Compass validation now matches the producer. No known source-code blockers remain.

## Rulings and limits
- This conversation already is the fresh execution task: save/read back the prompt, without recursive metaprompt-run. Cost if wrong: the saved prompt can be launched explicitly later.
- Keep app changes on an isolated feature branch, preserving original main. Cost: a later merge is needed to bring main up to date.
- Correct systemd EnvironmentFile test expectations to actual directive semantics. Cost if wrong: config loading would fail; actual installed service passed.
- Local machine must run for scraping. Same-path Blob overwrites can take60seconds to propagate; remote publication/local rename are not a distributed transaction.
- Required refresh-config was attempted and stopped at an unrelated pre-existing ~/.config/mimeapps.list conflict. It was not overwritten.

## Paste-ready Cursor prompt

Read ~/coding/scrape-weather/plans/scarborough-hourly.md and docs/handoff.md, then inspect the scraper and isolated weather-app checkout. Preserve the existing timer, private credentials, original main checkout and unrelated linux-config changes. Start by checking the public Blob age, systemd timer/service result and production API hourlySource/hourlyFetchedAt. Use npm test for scraper and app, app typecheck/build, and the grouped smoke tests when changing behavior. Do not recompile the prompt or invoke metaprompt-run.

## Commit subjects
- feat: scrape Scarborough hourly forecasts
- feat: display scraped Scarborough forecasts
- docs: record Scarborough deployment verification

Rollback: disable the user timer; retain the last Blob; unset WEATHER_BLOB_URL and redeploy for Open-Meteo fallback. Original app main remains available.

## Actual app commits and push

Pushed to https://github.com/Kevin-Mok/weather.git, branch feat/scarborough-hourly. Original main is unchanged. The first feature commit body contains literal backslash-n separators; history was preserved.

```text
3d1c4d634f3b787c9dd08868aad76397472127fa
feat: display scraped Scarborough forecasts

- Validate the hourly Blob feed and identify fallback/current sources.\n- Render every hourly metric and refresh open dashboards safely.\n- Cover feed boundaries, time zones and refresh lifecycle; update setup docs.
```

```text
449991765984fd8281d687bcf045e10adfefd1e4
docs: record Scarborough deployment verification
```


## Final release

The app HEAD449991765984fd8281d687bcf045e10adfefd1e4 is pushed to ssh/feat/scarborough-hourly and deployed READY as dpl_H8LvPFqKifFmqMk7c5cmR5dfVMBf at https://weather-kevinm.vercel.app. Vercel API metadata exactly matches HEAD. The final production one-hour request returned every metric and a recent fetch timestamp; the Kolkata request retained Open-Meteo and +05:30 current-hour selection.

Scraper commit remains local because no remote was configured. Canonical postmortem source/guidance learning was updated and all three targeted checks pass; those edits remain uncommitted alongside pre-existing changes in linux-config. Host refresh stopped safely on the unrelated MIME association conflict.
