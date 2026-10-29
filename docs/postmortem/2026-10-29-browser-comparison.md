# Weather browser comparison investigation

Track the reported redirect loop, local diagnostic evidence and any repair without confusing navigation success with a complete fresh extraction.

## Symptom and impact
Reported agent-browser ERR_TOO_MANY_REDIRECTS prevents refresh; last-good public feed reported October22. Production feed is preserved pending a validated repair.

## Evidence and lookup
- User's cloud inspection demonstrates 72 records but does not establish local controller reliability.
- Read canonical postmortem-memory skill; searched `agent-browser ERR_TOO_MANY_REDIRECTS sandbox Chrome weather` and `ERR_TOO_MANY_REDIRECTS`. No applicable verified TWN remedy; generic retrieval findings support checking installed versions only.
- Initial context helper lookup used nonexistent `personal_context.py`; corrected to installed `context_store.py` (topics/brief succeeded). No product impact.
- Initial inventory probed absent `tests/` and `test/browser.test.mjs`; actual tests are `test/*.test.mjs`. No files changed by those failed reads.
- Read-only search agent could not connect to systemd user bus inside sandbox. Host-authorized state inspection remains necessary before activation.

## Status and next steps
Verified client-side workaround; upstream redirect caching remains unchanged. Both original controllers fail on the exact URL, with native capture showing20 requests and17 cached redirects. The redirect chain alternates the normal URL and its server-issued query URL; issuance cookies are accepted and sent without blocked reasons. CDP cache-disabled controls use3 requests (302,302,200), return the exact supplied URL and all72 records. This supports cached issuance redirects as the local failure mechanism, not a controller-specific defect.

## Resolution and verification
- Retained agent-browser0.27.0; Playwright-core configures the active verified sandbox tab cache through CDP and provides the independent control. No hard-coded query workaround or sandbox relaxation.
- Three strict repaired pairs: native23.218/7.503/28.013seconds; direct Playwright2.172/1.934/2.247seconds. Different load waits mean these timings do not isolate controller performance.
- Every run validates JSON-only hydration, advertised JSON-LD coverage, source UTC/local agreement, location/units/generation freshness and entire DOM agreement.72 records span the repeated November1 hour without deduplication.
- A local HTTP cookie/cache302 reproducer fails with excessive redirects before preparation and passes after the cache override. Runtime Chrome156 reports adequate namespace/seccomp sandboxing.
- Independent review found missing full final-URL enforcement. Normal/timeout foreign/query/hash regressions observed RED, then GREEN11/11 publication tests after using location.href. Added safe generation/disagreement/URL rejection categories.
- Browser.getBrowserCommandLine failed because native launch lacks --enable-automation; SystemInfo browser PID plus its own /proc entry provided effective launch flags instead.
- First native cache-control probe targeted the Chrome new-tab page; actual active about:blank target was separate. Applying override to the correct active page restored navigation. Production locates its explicit chrome://sandbox target.
- First comparison treated native load timeout as failure; corrected to require exact final URL and complete validated readiness, preserving the production rule.
- Trial worker briefly introduced a parenthesis syntax error; corrected before runtime, focused trial tests GREEN. Sandbox-only child-process tests also failed EPERM; elevated final tests pass. These authoring/harness failures did not change production data.
- Dependency audit reports4 pre-existing high advisories in the pinned Blob dependency chain. No unrelated dependency upgrade attempted.

## Remaining work
Separate 48-attempt nonpublishing trial is installed and active at minutes 00/30. Production service/Blob remain unchanged pending acceptance; live DST transition and24-hour reliability are unverified. Installed service Result=success/ExecMainStatus=0 on attempt2; timer enabled/active, lingering=yes. Trial currently2 attempts:1 passed,1 failed; gate not accepted. No automatic promotion.

## First scheduled trial failure
The first real trial attempt at21:59:31Z navigated successfully (302,302,200, no cached redirects) but failed after beginning extraction, with a generic sanitized reason. No feed was published. This invalidates48/48 acceptance for this trial cohort; preserve the failed attempt. The18:00 calendar execution started independently before failure analysis finished. Next inspect extraction-stage diagnostics and preserve all trial evidence before any retry or repair.

## Per-attempt preservation
The first extraction failure is separately preserved in `2026-10-29-trial-attempt-01.md` and private `data/trial/postmortem-01.md`. Every later failed/interrupted trial writes a separate write-once sanitized postmortem. Later successes never erase failures; an active pending run is not labeled a confirmed failure. The original intermittent extraction cause remains unknown. GPT Online context is saved in `prompts/weather-browser-investigation.md`. Required refresh-config completed successfully (exit0) after scheduler changes.

## Resumed diagnostics,22:12UTC
- Canonical lookup `local-weather-intermittent-extraction` remains applicable/unresolved: original attempt01 page/error absent. No new scheduled attempt had run at resumption; next calendar18:30EDT.
- Independent source review identified early forecast-window rollover as a hypothesis: attempt02's21:58Z generation starts23:00Z. If served before22:00Z, it lies beyond permitted current/next hours. This cannot confirm attempt01's cause without its missing source body.
- Added safe checked/generated/allowed-first/actual-first-last UTC diagnostics, advertised/hydration/rendered counts, separate DOM evaluation and script retrieval phases, and first differing row/allowlisted field. Future failure summaries include these projections; existing reports are unchanged.
- Defining early-window, privacy, first-difference and failure-code fixtures observed RED before GREEN.47tests pass,1gated local browser case skipped by default and separately1/1pass. Independent review found no material blocker; coverage validation and publication remain unchanged.
- One independent nonpublishing execution passed72rows in20.605seconds: checked22:12:30Z, generated22:09Z, allowed starts22:00Z/23:00Z, actual first23:00Z and lastNovember1T22:00Z. It did not increment/reset trial counters and is not24-hour evidence.
- Resumption used one nonexistent optional installed diagnosing-bugs skill path; canonical lookup and previously read debugging skill were available. No product effect or remedial code followed that failed read.
- Continuing unattended gate remains unmet. Progress and review are saved in `plans/weather-trial/`; GPT Online prompt now includes the explicitly unconfirmed rollover hypothesis and new diagnostic fields.


## User-requested operational restoration,22:25UTC
The operator subsequently asked to scrape and configure cron/systemd so https://weather-kevinm.vercel.app/ receives updates now. This supersedes holding the publishing path unchanged; it does not establish or waive the failed trial’s48/48 reliability result.
- Confirmed old service path pointed to original checkout and failed. Public Blob still fetchedOctober22; deployed APIHTTP200 reported stale fallback to Open-Meteo.
- The web retrieval tool could not open the supplied site. Direct HTTPS fetch and a later separate Chrome tab both worked; retrieval failure was not an application outage.
- Added CLI failure and interruption preservation, sharing the sanitized writer with trial. Credential-missing failure observed RED before report capture; arbitrary pending-field regression RED before projection. No production attempt has failed since activation.
- Before activation preserved original feed and condition-catalog history with exclusive copies; original units backed up. Existing private environment unchanged. Installed repaired worktree via npmsetup, validated units, kept existing00/30calendar and300second timeout.
- Manual service18:25:27→18:25:57EDT Resultsuccess/exit0. New fetchedAt22:25:56.053Z contains72records; deployed12-hour API verified all fields equal with sourceTWN/fallbacknull/currentOpen-Meteo. Browser visibly shows TWN and fetched18:25:56Toronto. Original catalog names all retained.
- Full tests49passed/1skipped; separate browser1/1; independent narrow review no material blocker. No redeployment, cron duplication, token change or cohort reset. Future failures keep reports under data/failures; process-kill markers recover on next invocation and conservatively report possible remote publication.
- The initial extraction failure remains unresolved. Keep this worktree/Node path and running networked PC; reliability/DST gates remain unmet even though live publication now works.

Automatic verification:18:30calendar publishing run completed18:30:15EDT with exit0 and72rows published; Vercel API at22:30:58Z showed new fetchedAt22:30:11.620Z/TWN/nullfallback/12rows. Trial third attempt also succeeded; totals3attempts/2successes/1retainedfailure. This demonstrates the restored schedule runs unattended once, not48/48 or DST acceptance.
