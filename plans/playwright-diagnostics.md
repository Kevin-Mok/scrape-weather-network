# Sandboxed browser comparison

Compare the pinned agent-browser wrapper with direct Playwright on the same system Chrome, then retain the smallest demonstrated repair. Keep the dashboard, public feed contract and half-hour timer cadence intact.

## Scope and decisions
- User supplied the comparison/extraction design and authorized implementation in a new worktree; written Pelmorex permission confirmed in this conversation.
- Worktree: `.worktrees/playwright-diagnostics`, branch `feat/playwright-diagnostics`; initial scraper main and worktree clean. Dashboard has unrelated untracked prompts, preserved.
- Use `/usr/bin/google-chrome`, headless, sandbox enabled, clean separate profiles, exact source URL, no issuance-query workaround. No publication during comparison.
- Capture sanitized document chain/cookie metadata before navigation; omit cookie/header values and query values. Reject access denial; do not escalate workarounds.
- Keep agent-browser if both pass or a small repair suffices. Advance Playwright only after 3/3 valid extractions against repeated agent-browser failures. Launch differences preclude controller-only causality claims.
- Preserve schema v1, Blob cache 60s and dashboard stale threshold 90m. Never freshen stale source generation data.

## Atomic work
- [x] Establish baseline tests and reproduce paired navigation with effective arguments/sandbox evidence.
- [x] Test defining extraction/diagnostic changes RED, implement minimum GREEN, validate every available hour using source UTC and Toronto local agreement.
- [x] Add bounded non-publishing trial scheduling, preserving production until candidate qualifies; verify rendered units and actual user timer state.
- [x] Update README and smoke checks, run full tests and independent review; record commands, results and remaining limits here.

## Verification and acceptance
- Same-host pair, then repeat twice if outcomes differ; extraction success requires complete coverage, unique continuous UTC hours and all fields validated.
- Fixtures cover DST repeated hours, zero/negative values, explicit unavailable, missing/truncated columns, malformed times and stale generation.
- 48 half-hour non-publishing executions across 24h, process/browser restart per run, first-attempt vs recovery counts, timings/count/coverage/generation/rejection reason. Gate 48/48 valid, zero silent errors, each below 300s; DST transition requires longer observation.
- Rollback: restore prior service path and adapter; keep last-good feed unchanged and dashboard fallback active. Worktree must remain while referenced by units.

## Investigation
- Postmortem lookup `ERR_TOO_MANY_REDIRECTS` returned unrelated generic matches, no demonstrated TWN repair. Broad sandbox findings concern harness startup and do not establish this browser failure's cause.
- Native worktree tool created a dashboard worktree first; correct scraper worktree then created under its ignored `.worktrees/` directory. Dashboard files unchanged.
- Environment and inspection lookup failures are recorded in `docs/postmortem/2026-10-29-browser-comparison.md`.


## Verified implementation and runtime
- Native worktree at `/home/kevin/coding/scrape-weather/.worktrees/playwright-diagnostics`, branch `feat/playwright-diagnostics`. Source main preserved; unused native-created dashboard checkout is separate and untouched.
- Both cache-default controls fail ERR_TOO_MANY_REDIRECTS. Native20 requests include17 cached redirects despite accepted/sent issuance cookies.
- Both cache-disabled controls follow3 document requests (302/302/200) to the exact original URL. Kept agent-browser; Playwright-core1.64.1 configures its active tab cache via CDP and provides the comparison control.
- Three strict pairs native23.218/7.503/28.013seconds versus direct2.172/1.934/2.247seconds; all72 hourly records match JSON-only hydration and rendered DOM. Different load waits prevent a controller-only performance conclusion.
- Source generation validated21:53Z for paired runs. UTC22:00October29 to21:00November1; Toronto18:00-04 to16:00-05, preserving repeated01:00 onNovember1.
- Defining regressions observed RED then GREEN for cache preparation, structured metadata rejection, exact URL checks, privacy categories, trial state/coverage/pending behavior, render-only setup and per-failure reports.
- Final `npm test`:42passed,1skipped,0failed; the skipped local sandbox browser case separately passes1/1 via `npm run test:browser`. No TypeScript/build/lint scripts exist in this Node-only scraper.
- `npm run setup:trial -- --render-only data/trial-units` and `systemd-analyze --user verify` on both units exit0.
- Trial installed via `npm run setup:trial`: separate service, minutes00/30,300second timeout, no EnvironmentFile/Blob access; actual timer enabled/active and Linger=yes.
- Actual attempt1 at21:59:31Z failed extraction after successful normal navigation in19.036seconds. Cause unknown; preserved separately. Attempt2 at22:00:01Z passed72records in29.335seconds, source generated21:58Z. No hidden retry. Status2attempts/1success/1failure/0missedSlots/accepted=false.
- Briefly paused only trial timer for failure investigation, then resumed. Existing production units and public Blob never changed. The cohort already misses48/48; keep all evidence and do not automatically promote.
- `refresh-config` exit0. README gate `update_in_same_change`: documented pinned controller, strict extraction, exact flags, separate trial, persistence and rollback; recruiter-first opening/stack preserved.
- Independent reviewer checked source/fixtures/private sanitized evidence. Found exact full-URL gap: fixed with RED/GREEN regression. No remaining material core/privacy findings. Per-attempt addition reviewed separately before handoff.
- Dependency audit:4 existing high advisories in Blob chain, not introduced by Playwright. No unrelated upgrade.

## Remaining acceptance work
- [ ] Finish scheduled cohort and inspect every failed-attempt postmortem. Do not call this cohort accepted even if all remaining46runs pass.
- [ ] Diagnose intermittent extraction using recorded stage/reason; preserve the unknown original cause rather than claiming a fix. Use the saved GPT Online prompt if evidence cannot identify a reliable remedy.
- [ ] Establish a new explicitly documented48/48 cohort after any proven repair, preserving the failed cohort; include real DST-transition observation separately.
- [ ] Promote only after acceptance/review using existing production setup; retain last-good feed and rollback path. No publication, deployment, commit or push performed in this task.

## Repeatable verification and handoff
Automated: `npm test`; `npm run test:browser`; render-only trial setup plus systemd-analyze verification. Manual/runtime: compare default/repaired pair; `npm run scrape -- --local`; inspect trial status, each `postmortem-NN.md`, enabled timer and latest service Result; observe remaining calendar runs. README and docs/smoke-tests contain usage and expected outcomes.

Cursor continuation prompt: Read this plan, the living browser-comparison postmortem, the separate first trial postmortem and `prompts/weather-browser-investigation.md`. Work in this scraper worktree. Read saved trial status and every new failed-attempt postmortem, preserve all cohorts and last-good feeds, update reviewed postmortem hashes, reproduce any failure before fixing, and recommend promotion or an evidence-backed alternative only after the stated gates. Do not claim the first intermittent extraction failure resolved from a later passing run.

Suggested Conventional Commit: `fix: avoid cached weather redirects and record trial failures`. Keep this plan, parser/browser/diagnostic code, scheduler, tests and docs in the same commit if delivery is later authorized.

References: [Playwright BrowserType](https://playwright.dev/docs/api/class-browsertype), [CDP Network](https://chromedevtools.github.io/devtools-protocol/tot/Network/). Installed runtime evidence governs the specific Chrome behavior observed here.

Canonical learning updated in linux-config sources.json and browser-integrations.md: cache workaround is runtime-verified, intermittent extraction remains unresolved. Targeted checks for both tracked reports and the generated first failure summary all exit0, no errors/changed/unregistered aliases. Preserved unrelated pre-existing linux-config dirty work. Final reviewer wording fix labels optional interrupted-run evidence as “when present”; defining final-attempt interruption regression observed RED then GREEN.

## Resumed investigation: 2026-10-29
- Recovered this plan, worktree status and current service status. Still2 attempts/1success/1failure; next ordinary timer18:30EDT, no new failure yet. Preserve current cohort and production configuration.
- Lookup `local-weather-intermittent-extraction` matches canonical unresolved finding; applicable because original attempt01 body/error is missing. Existing cache workaround does not establish an extraction repair.
- Independent read-only investigation identified a discriminating hypothesis: attempt02 source generated21:58Z starts23:00Z. If already served at21:59, this is beyond current/next coverage; identical data passes after22:00. This is unconfirmed because attempt01 source body was not retained. Keep coverage rejection unchanged.
- [x] Add defining before/after-hour diagnostics test RED, then safe source-count/UTC/allowed-start evidence and specific rejection codes GREEN.
- [x] Persist those allowlisted details into each future failure postmortem; existing reports remain immutable.
- [x] Verify with tests and one separate nonpublishing diagnostic execution, without incrementing/resetting the scheduled cohort or claiming24-hour acceptance.
- [x] Refresh GPT Online context and continued-session handoff; leave next scheduled observation as the next evidence point.
- Non-product read failure: attempted a nonexistent installed diagnosing-bugs skill path during resumption; already-read systematic-debugging guidance and canonical postmortem lookup remain authoritative. No application effect.

Resumed verification:47passed/1skipped, local browser1/1; independent live diagnostic72rows20.605s, no cohort increment/publication. Narrow reviewer found no material safety/privacy issue. See [continued brief](weather-trial/task.md), [progress](weather-trial/progress.md) and [checks](weather-trial/checks.md). Next ordinary calendar observation18:30EDT; original cause and acceptance remain unresolved.

## Restore the publishing service: user request2026-10-29
User now asks to scrape and configure cron/systemd so the deployed Vercel dashboard receives updates. Use the existing systemd timer (no duplicate cron), repoint its publishing service to this repaired worktree, preserve its private credential file, publish once and verify Blob propagation plus deployed API metadata. This is an operational restoration with fail-closed validation, not a claim that the failed48-run trial is accepted.
- Baseline: production service still points to original main checkout and failed; Blob last fetched2026-10-22T20:30:27.955Z. Deployed API returns Open-Meteo with stale fallback.
- Web retrieval service could not open the supplied site; direct HTTPS Node fetch returned200 for Blob/API. Tool retrieval failure did not establish application outage.
- [x] Add production-failure postmortem regression RED; share existing report writer and make CLI preserve sanitized failure evidence GREEN.
- [x] Reuse existing `npm run setup` and serialized service commands; avoid another wrapper. Verify units and fresh local extraction, then install and run the repaired publishing service.
- [x] Verify public feed freshness and complete schema, propagation and Vercel API agreement; document exact production path, timer/uptime requirement, failure evidence and rollback.
- [x] Review/test, update canonical learning and refresh config; retain failed trial and production restoration risks explicitly.


### Operational restoration evidence
- User requested the deployed website work now; restored fail-closed publication without claiming the failed trial meets48/48. Prior acceptance criteria and failures remain retained as reliability evidence.
- CLI failure capture RED on absent report directory, then GREEN; interrupted-marker arbitrary-field regression RED, then GREEN. Shared pure writer moved to `src/failure-report.mjs`, trial reexport retained. Production pending capture in `src/publication-attempt.mjs` covers handled failures and next-start interruption recovery.
- Independent review:5verified code claims, no material blocker; full tests49passed/1skipped and local Chrome fixture separately1/1.
- Preflight actual CLI local72records passed, generated22:20Z. Original ignored feed and accumulated condition catalog copied exclusively into worktree; prior unit files backed up under data/units-before-activation.
- `npm run setup` exit0, systemd-analyze verification exit0; installed production ExecStart now references this worktree. Manual service run18:25:27→18:25:57EDT Result=success/ExecMainStatus=0, TimeoutStartUSec5min; timer next18:30EDT.
- Published fetchedAt2026-10-29T22:25:56.053Z; verification22:26:47Z found72Blob rows,12Vercel API rows all field-equal, hourlySource the-weather-network/fallbacknull/currentSourceopen-meteo. Every original condition-catalog name remains.
- Public browser tab independently renders The Weather Network, Toronto fetched18:25:56,12readable hourly cards. Same deployed URL and Blob configuration; no deployment required or performed.
- User operation: this checkout → `npm run setup` → `systemctl --user start scrape-weather.service` → wait for cache propagation and inspect dashboard. Computer uptime/network and keeping worktree/Node paths intact remain necessary.

Automatic calendar verification:18:30:00→18:30:15EDT publishing service Resultsuccess/exit0; source generated22:29Z, fetched22:30:11.620Z,72rows published. Deployed API at22:30:58Z matches latest local fetchedAt, sourceTWN/fallbacknull/12rows. Next publishing timer19:00EDT. Trial attempt3also passed:3attempts/2successes/1preservedfailure, stillunaccepted. No new production failure postmortem required; handled/crash paths tested. All related plans/docs remain with uncommitted implementation.


## Session delivery milestone — fix: restore sandboxed weather publishing
- Scope: session01a189a0-c670-74f3-b8b8-aed63509182a. Scope helper reports unsafe/no detected writes because nested functions.exec commands are not recognized; direct observed writes and the captured clean scraper baseline establish ownership of all28candidate files, including matching plans, docs and tests. Ignored data, credentials, browser profiles and unrelated dashboard prompts stay excluded.
- Verified: fresh npm test49passed/1skipped; separate local browser1/1; earlier manual and automatic18:30publication reached Blob/API/browser with all fields matching. README gate update_in_same_change: truthful setup/flags/stack/failure persistence retained and spacing repaired; final candidate privacy check required immediately before commit.
- Delivery: one focused implementation commit on feat/playwright-diagnostics and push to origin/feat/playwright-diagnostics. Companion canonical weather-learning additions are isolated from the dirty linux-config baseline in a separate scoped documentation commit.
- Remaining: the original extraction failure and failed reliability cohort stay explicit; no24-hour/DST claim. PC uptime/worktree/Node paths remain necessary. Rollback restores the prior adapter/service path while keeping the last-good forecast timestamp.

Commit milestone recorded: implementation commit b01622e (`fix: restore sandboxed weather publishing`) contains28session-owned files and passed exact-candidate privacy review. This documentation follow-up records the precise scope; both implementation and its matching plans remain included in the series. Push target:origin/feat/playwright-diagnostics.
