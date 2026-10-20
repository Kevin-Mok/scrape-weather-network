# Scraper execution environment

Record setup and access failures while implementing the Scarborough feed, with evidence and recovery steps.

## Initial Git probe
- Symptom: `git status --short` returned exit 128: not a Git repository, including with the explicit scraper working directory.
- Impact: no existing Git history or branch can be reused in the scraper directory. No files were modified by these probes.
- Evidence: explicit `pwd` identified the scraper checkout (`~/coding/scrape-weather`, home path abbreviated); Git still reported no repository.
- Lookup: postmortem-memory search `not a git repository working directory` returned optional-path discovery guidance; applicable lesson is to use observed inventory rather than assume a checkout exists.
- Status: investigation; repository mapping is in progress.
- Next: inspect actual inventory and initialize a task repository only if the directory is empty/unowned.
- Learning: canonical ledger updates pending; its source directory is outside the writable workspace.

## Vercel access probe
- Symptom: `vercel whoami` reports logged out, and its updater cannot write under the read-only home cache.
- Impact: existing-site deployment and Blob provisioning require authentication; no credentials present in environment.
- Status: implementation continues. Configure CLI cache inside writable workspace for later calls; authenticate only through the normal Vercel flow.
- Initial Git probe resolution: empty .git confirmed; initialized new feature branch.

## Headless browser launch
- agent-browser failed before page navigation: Chromium reported “No usable sandbox”; chrome-devtools navigation separately timed out.
- Impact: live DOM inspection blocked until browser launch is adapted for this host.
- Evidence: installed Chromium 1208 exists; launch stderr identifies unavailable user-namespace sandbox.
- Lookup: querying canonical memory for Chrome sandbox failures before remedy.
- Status: pending doctor diagnosis and container-compatible launch; no feed published.

## Live scrape navigation timeout
- Installed Google Chrome runs sandboxed and direct inspection extracted all 72 rows.
- First full CLI scrape timed out during `open`; it aborted before extraction and closed the browser, preserving prior output. Heavy page advertising can prevent the default load event from settling.
- Status: reproduce with DOM readiness instead of waiting on full page load; retain the explicit row readiness check.
- Prior memory applicability: browser timeout guidance requires examining actual navigation readiness, not disabling validation.

## systemd EnvironmentFile path
- Rendered unit verification warned that a quoted EnvironmentFile path is not absolute. This directive retains quote characters, unlike ExecStart arguments.
- Resolution: use the absolute path directly with escaped percent specifiers; keep proper ExecStart argument quoting and reject control characters.
- Defining evidence: systemd-analyze warned on the old rendered service; re-verification must show no unit warnings.
- Ruling: correct the unit test expectation to actual systemd semantics; no behavior requirement was relaxed.

## Verified resolution
- Empty directory bootstrapped as new scraper repository; unrelated harness metadata ignored.
- Vercel device authentication completed; public Blob store connected, feed published and app URL configured. Credentials remain private.
- Explicit installed Google Chrome works with sandbox enabled; bundled Chromium host limitation remains.
- Navigation timeout continuation is limited to the exact source and strict rendered-row readiness; regression test observed RED then GREEN.
- Generated EnvironmentFile directive corrected; systemd-analyze verification has no warnings.
- Installed service executed successfully, fetched all72 hours, published and saved. Result=success, ExecMainStatus=0; timer active at00/30 with5-minute timeout and lingering.
- Full scraper suite14/14 passes. Browser cleanup and failed-publication preservation covered.
- No new reusable memory finding is required: existing explicit sandboxed-channel, optional-path discovery and real-systemd validation guidance cover these environment adaptations. Canonical hash registration follows final report write.

## Required configuration refresh
- `fish -c refresh-config` ran after configuration changes and exited1: chezmoi apply stopped; private log `/tmp/refresh-config.iaahPL2g.log`. No files adopted according to helper output.
- Impact: required host refresh incomplete; scraper and app verification continue independently.
- Status: inspect diagnostic cause without forcing unrelated live differences. Canonical memory lookup applies existing operational-drift guidance; leave unrelated user configuration preserved.

- Refresh diagnosis: unrelated `~/.config/mimeapps.list` changed since chezmoi last wrote it; noninteractive apply got EOF at its conflict prompt. Preserve it; no forced overwrite or retry. Host refresh remains blocked on reconciling that pre-existing change.
- App feature commit3d1c4d6 used a quoted `-m` body containing literal backslash-n separators. Preserve published history; subsequent commit messages use files with real newlines. This affects formatting only.
