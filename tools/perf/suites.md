# Browser performance suites

Three Playwright suites measure the production web export against a seeded Server.
They are frame and latency instruments: none of them asserts a speed budget.

| Suite | File | Scenarios |
| --- | --- | --- |
| Frames | `interactions.perf.mts` | `sidebar`, `sessions`, `drawer`, and the Feed scenarios (`feed`, `expand`, `paging`, `streaming`) |
| Frames | `agents.perf.mts` | `agents`, `agents-phone`, against a 200-Agent registry |
| Elapsed | `elapsed.perf.mts` | `session-open-warm`, `session-open-reload`, `feed-page-ready`, `tool-expand-ready`, `feed-wheel-ready`, `sessions-wheel-ready`, `composer-type-ready`, and the scenarios under "Elapsed scenarios by case" |
| Soak | `soak.perf.mts` | One test, `soak for N minutes`, declared only when `PERF_SOAK_MINUTES` is set |
| Collector | `collector.perf.mts` | The frame collector's own sensitivity checks; no product scenario |

## Run them

```sh
PERF_LABEL=qa-baseline PERF_CPU=1 PERF_RUNS=10 PERF_OUT=/tmp/argo-perf-qa \
  pnpm --filter @repo/tools perf
```

The suites hold `@repo/browser-suite-lock`, so one runs per machine.
Reserve a quiet measurement window first: a run taken under load measures the machine.

| Variable | Effect |
| --- | --- |
| `PERF_LABEL` | Names the run and its result files; default `current` |
| `PERF_CPU` | CPU slowdowns to measure at, comma separated; default `1,4` |
| `PERF_RUNS` | Measured windows per scenario; default `3` |
| `PERF_ONLY` | Scenario names to measure, comma separated; empty or unset measures all |
| `PERF_OUT` | Where the reports and screenshots go; default `$TMPDIR/argo-perf` |
| `PERF_HEADED=1` | Runs with a visible browser, as a cross-check against the headless collector |
| `PERF_TRACE=1`, `PERF_PROFILE=1` | Save one trace or CPU profile per scenario; these artefacts are large |

## Elapsed scenarios by case

None of these has been measured. Each was authored and type-checked; a run on a quiet machine is what measures it.
Scenarios marked **driver** have no browser observation: the page is replaced, or the Server restarted, under the probe.
They are timed on the driver's clock alone, which includes automation round trips, and their report carries `summary.driver` only.

| Case | Scenario | Clock | Boundary |
| --- | --- | --- | --- |
| PF-01 App | `app-launch-list-ready` | driver | Navigation commit from a blank document with the HTTP cache and stored data cleared → first Sessions row drawn. Browser and Server stay warm |
| PF-01 App | `app-launch-composer-ready` | driver | The same start → the long Session opened from its row, latest Feed text drawn, Composer enabled |
| PF-01 Server, PF-03 | `server-restart-ready` | driver | Server process launch → it publishes its address on the same port and data. The stop before it is not timed; filesystem cache is warm; browser CPU slowdown does not apply, so only 1x runs |
| PF-03 | `server-restart-reconnected` | driver | Server ready → the Connection banner (`Reconnecting…` or `Can't reach …`) is gone |
| PF-03 | `server-restart-usable` | driver | Server ready → banner gone, latest Feed text drawn, Composer enabled |
| PF-02 | `window-reopen-ready` | driver | Navigation commit after the document closed with a draft typed → long Session reopened, Feed drawn, Composer enabled and holding the draft exactly |
| PF-20 touch | `feed-touch-ready`, `sessions-touch-ready` | browser | Touch swipe from `Input.synthesizeScrollGesture` → changed scroll position. Desktop-width viewport; no inertia read |
| PF-21 diff | `diff-small-ready`, `diff-large-ready` | browser | Changes overview press → first changed line drawn in the Changes list. One 8-line changed file, or one 2,000-line changed file (every line changed), written into the Project's git repository by `diff-fixture.mts` |
| PF-23 search | `sessions-search-ready` | browser | Sessions search `input` event → a matching title drawn and a non-matching one gone, over the seeded Sessions |
| PF-13, scripted only | `turns-concurrent-1-scripted`, `-2-`, `-4-` | driver | Send pressed together in N Sessions → Stop drawn then gone on every page. Only the slowest Session's finish; 1x only |
| PF-14 | `attachment-{preview,upload}-{text,image}-{small,large}-ready` | driver | Preview: file chooser selection → preview in the Composer. Upload: Send → the Server answers the Blob with every byte. Files are random synthetic content, new each trial |

Server restart scenarios restart the one Server of the run and leave it on the same port.
Browser CPU slowdown reaches only the first page. A scenario it cannot reach (`server-restart-ready`, `turns-concurrent-*-scripted`) is recorded `notApplicable`, with its reason, at any slowdown other than 1x, and never as a measurement.
An unset `PERF_ONLY` plans all of them, so a default elapsed run is now much longer; name the scenarios to run fewer.

## What these scenarios do not cover

- **PF-01 first frame** and **PF-02 native foreground resume** have no web equivalent here. The native half needs a device run.
- **PF-13** with a real Agent: queue delay, provider contention, and per-Session CPU and memory. `turns-concurrent-*-scripted` uses the fixture Agent and is not PF-13 evidence.
- **PF-14** Agent receipt of the file, and a file the App rejects as too large: a rejected file shows as a timed-out preview, not as a size limit.
- **PF-21** Back and tab switching, and the phone's changed-files sheet.
- **PF-17** and **PF-04 to PF-12** need a real Agent. The `streaming` scenario uses a scripted Agent and is not PF-17.

## Soak (PF-24)

```sh
PERF_SOAK_MINUTES=30 PERF_LABEL=soak PERF_OUT=/tmp/argo-perf-soak pnpm --filter @repo/tools perf soak.perf.mts
```

The soak repeats one cycle: scroll the Sessions list, open and scroll the long Feed, open another Session, send a prompt to the scripted Agent and, on every second cycle, press Stop.
It takes the Session-open probe at the start, every `PERF_SOAK_PROBE_MINUTES` (default 5) and at the end, and samples every `PERF_SOAK_SAMPLE_SECONDS` (default 60):

- App: Chromium JS heap, DOM nodes, event listeners and documents.
- Server: process count, summed resident memory and CPU of the listening process and everything below it, from `ps`.

`<label>-soak.json` holds the raw probes and samples and counts cancellations whose Stop button actually appeared.
It states no verdict: raw growth alone does not prove a leak, and Server reads and subscriptions are not observed.
The test's own timeout is the soak plus ten minutes; no other timeout changes.

## Read the report

`<label>.json` holds the frame scenarios, `<label>-agents.json` the Agents suite, and `<label>-elapsed.json` the elapsed suite.

Every report carries a `run` block:

```json
{ "status": "partial", "planned": ["drawer at 1x CPU"], "measured": [], "notApplicable": [], "missing": ["drawer at 1x CPU"] }
```

`planned` is every scenario the run set out to measure, after `PERF_ONLY` and `PERF_CPU`.
Each suite declares its tests from that same list, so the plan cannot drift from the tests the run queued.
`measured` produced a result, `notApplicable` carries its own recorded reason, and `missing` produced nothing.
A run with anything in `missing` writes `"status": "partial"`, prints `INCOMPLETE RUN` with every missing scenario, and fails.

**A scenario in `missing` was not measured.** It is not a passing result, a zero, or an absent regression.
A run that planned no scenarios at all, which an unmatched `PERF_ONLY` produces, is partial for the same reason.
For the elapsed suite, a scenario whose every trial failed or timed out is `missing`: it recorded what happened, but it timed nothing.

## What has and has not been verified

**No run of these suites has been taken on a quiet machine, so no number from any of them is a baseline.**

`sidebar` and `sessions` do execute end to end: both ran on 2026-10-30 against this build, 3 windows each at 1x CPU, and the report came back `"status": "complete"`.
That verifies the scenarios, not their numbers — the host was at a 1-minute load average between 174 and 214 throughout.

No `PERF_HEADED=1` cross-check against the headless collector has been done.
One was attempted in the same window and abandoned when the host reached a load average of 429; a headed run under that load cannot tell an insensitive collector from a loaded machine.
It is still outstanding from PR #1482 and needs a quiet measurement window, not a code change.

One observation from the loaded run, which bears on how these numbers are read: at a load average around 200 the frame intervals were identical in every window — 16.8 ms maximum, zero dropped frames — while the compositor's own counters did move, one `sessions` window reporting 62 partial frames and one dropped.
Read `partialFrames` and `compositorDropped` for whether a window was disturbed. Do not read a flat `maxMs` as a quiet one.

## What the numbers do not say

`p95Ms` is a frame interval, not p95 time to open, Send or finish.
`durationMs` is the sampled window, and some scenarios include their settling waits.
The steady scroll is a programmatic `scrollTop` write, so it is weak evidence about real input handling.
`longTasks` has come back `0` in stalled and clean windows alike; never read it as a quiet main thread.
Web CPU throttling is a stress condition, not a low-end phone.
`collector.perf.mts` proves the collector sees a held main thread and the compositor's partial frames; it does not make the scenarios above into a budget.
