# Investigate remaining weather scraper failures

Use this prompt with GPT Online alongside the latest per-attempt postmortems to evaluate the unresolved extraction failures and evidence-backed alternatives. Read the observations first, separate hypotheses, then propose the smallest discriminating experiment.

## Prompt

We operate a permitted Scarborough Weather Network scraper on Ubuntu using Node22.15.0, Google Chrome156.0.8078.47 at /usr/bin/google-chrome, agent-browser0.27.0 and playwright-core1.64.1. Written source-owner permission is in place. Exact target: https://www.theweathernetwork.com/en/city/ca/ontario/scarborough/hourly . Do not suggest evading verification, disabling the browser sandbox, or hard-coding issuance query parameters.

Both native agent-browser and direct Playwright with fresh separate profiles and the same sandboxed system Chrome originally failed ERR_TOO_MANY_REDIRECTS. Capture attached before navigation shows normal URL↔server-issued `_guid_iss_` query302 loops; native20 requests included17 cached redirects. Issuance cookies were accepted/sent with no blocked reasons. CDP Network.setCacheDisabled(true), on the correct active target, makes both controllers follow302→302→200 to the exact original URL. No cookie manipulation or synthetic source URL is used.

Three repaired paired extractions passed all72 records, including the repeated November1 Toronto hour. Native total times23.218/7.503/28.013seconds; direct Playwright2.172/1.934/2.247seconds. Native waits for load and direct Playwright waits DOMContentLoaded, so do not attribute the difference solely to controller overhead. We retained native controller and use Playwright CDP only for cache configuration/diagnostics.

The extractor parses inline JSON-LD and JSON-encoded Next hydration as data (never evals script text, never resolves opaque React record IDs). It validates advertised coverage/parallel columns, location, Celsius/km/h/percentage units, source generation no older than90minutes/not future, source UTC/local agreement, unique continuous UTC hours, all fields, and exact full-array agreement with expanded rendered DOM. Zeros/negatives and explicit-null unavailable values survive; missing/malformed fields fail closed. It only expands layout when aria-checked is false. Final location.href must exactly equal the supplied URL, including after load timeout. Schema1 publication/Blob cache60seconds/dashboard stale fallback90minutes remain unchanged.

A separate nonpublishing systemd trial now executes at minutes00/30, fresh process/browser each time,300-second limit. It saves pending state before launch, counts interrupted attempts as failures, has no hidden retries, and stops browser access after48 attempts. No automatic production promotion occurs. At initial handoff, attempt1 failed after19.036seconds during extraction despite successful navigation; its original generic error omitted the exact cause. Attempt2 succeeded in29.335seconds with72 records generated21:58Z. The cohort cannot pass48/48. Later runs may add evidence: use supplied run summaries rather than assuming these initial counts are current.

Every future failed/interrupted attempt receives a sanitized postmortem; stage/rejection category, main navigation chain, cookie metadata (no values), timings and source coverage are retained privately. Review those attached reports. The first missing detail cannot be recovered from later instrumentation. Raw headers, cookie values, query values and traces must not be uploaded.

Resumed investigation added safe sourceCoverage diagnostics: checkedAt UTC, generation UTC, advertised/hydration/rendered counts, first/last UTC and allowed current/next UTC start pair. Failures also record separate DOM evaluation versus script retrieval stages; disagreement records only first row index and allowlisted field name, never arbitrary values. Fixture evidence shows a forecast starting two UTC hours ahead fails just before the boundary and passes just afterward. Attempt02's21:58Z generation with23:00Z first hour suggests this could explain attempt01 at21:59Z, but the missing attempt01 body prevents confirmation. Do not weaken coverage as a presumed fix.

One independent resumed nonpublishing diagnostic at22:12Z passed72rows, source generated22:09Z, first23:00Z, allowed starts22:00Z/23:00Z. It is not a scheduled cohort attempt or a reliability benchmark.47tests plus the local sandboxed browser reproducer pass.

Investigate the remaining intermittent extraction failure. Clearly separate what was observed from hypotheses. Identify the highest-value missing evidence, propose one minimal diagnostic per hypothesis, and rank ordinary permitted alternatives only if repeated failures establish a benefit. Do not claim Playwright solves the redirect issue better: the same cache setting repairs both. Consider a documented licensed provider/API only after checking exact field/forecast equivalence and access arrangements. Compare operational cost, scheduling, PC uptime, freshness and silent-data-error risks.

Return: evidence table, remaining hypotheses, smallest next experiment, and a recommendation with explicit acceptance/rollback criteria. State when evidence is insufficient. Preserve the last-good feed without changing its fetchedAt, public schema1 contract,60-second cache,90-minute stale rejection and visible dashboard fallback.

## Attachments
- `docs/postmortem/2026-10-29-browser-comparison.md`
- `docs/postmortem/2026-10-29-trial-attempt-01.md`
- Latest `data/trial/postmortem-*.md` (sanitized per-attempt summaries)
- `npm run trial -- --status` output; review date/time matters.
- If needed, reviewed sanitized main-frame excerpts from ignored comparison JSON. Do not attach private credentials or unreviewed raw browser artifacts.

## Later operational restoration
At the operator’s subsequent request, publication was restored from the repaired checkout before sustained reliability acceptance. Manual service run18:25EDT succeeded; Blob fetchedAt22:25:56Z contained72records; deployed API and visible dashboard matched and reported TWN without fallback. The failed trial remains unchanged/unaccepted. Publishing failures now also produce sanitized postmortems under data/failures, with a pending marker recovered as INTERRUPTED after process death. Do not repeat the older statement that production remains unchanged; distinguish operational restoration from a successful48-run trial.
