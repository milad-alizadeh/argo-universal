# Browser performance suites

Three Playwright suites measure the production web export against a seeded Server.
They are frame and latency instruments: none of them asserts a speed budget.

| Suite | File | Scenarios |
| --- | --- | --- |
| Frames | `interactions.perf.mts` | `sidebar`, `sessions`, `drawer`, and the Feed scenarios (`feed`, `expand`, `paging`, `streaming`) |
| Frames | `agents.perf.mts` | `agents`, `agents-phone`, against a 200-Agent registry |
| Elapsed | `elapsed.perf.mts` | `session-open-warm`, `session-open-reload`, `feed-page-ready`, `tool-expand-ready`, `feed-wheel-ready`, `sessions-wheel-ready`, `composer-type-ready`, and the scenarios under "Elapsed scenarios by case" |
| Anchor | `anchor.perf.mts` | `feed-anchor-drift` (PF-18, anchor stability) |
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
| `PERF_FEED_ROWS` | Feed rows of the long Session: 100, 1000 or 10000; default the recorded Feed's 644 |
| `PERF_FEED_CONTENT` | `blank` seeds the long Session with messages whose text is empty (PF-16, blank content); default `recorded`. See "Blank content and anchor drift" |
| `PERF_ONLY` | Scenario names to measure, comma separated; empty or unset measures all |
| `PERF_OUT` | Where the reports and screenshots go; default `$TMPDIR/argo-perf` |
| `PERF_HEADED=1` | Runs with a visible browser, as a cross-check against the headless collector |
| `PERF_TRACE=1`, `PERF_PROFILE=1` | Save one trace or CPU profile per scenario; these artefacts are large |

## Blank content and anchor drift

Two QA clauses that had no instrument now have one. Neither asserts a budget.

**PF-16, blank content.** What this makes measurable is Feed rows whose messages hold empty text. `PERF_FEED_CONTENT=blank` seeds the long Session with the recorded Feed (at `PERF_FEED_ROWS` rows when set) with the text of every prompt, thought and answer emptied; Tool calls and compaction rows stay as recorded. Run the frame scenarios against it:

```sh
PERF_FEED_CONTENT=blank PERF_ONLY=feed,expand,paging,streaming PERF_LABEL=pf16-blank pnpm --filter @repo/tools perf interactions.perf.mts
```

A Session whose every row is blank cannot be seeded for this: the App draws it as an empty Session ("What should we build?") with no `feed-scroll` to measure, so the blank rows are mixed in among rows that draw. The report's `feedContent` names the seed. Elapsed scenarios that wait for the recorded text (`hasLatestMessage`, `feed-page-ready`, `tool-expand-ready`) cannot run against a blank Feed; run only the frame scenarios on it.

**PF-18, anchor stability.** `feed-anchor-drift` (`anchor.perf.mts`, report `<label>-anchor.json`) opens the long Session from cold, reads back with the wheel to a screen below its oldest loaded row, and marks the row at the middle of the view once the rows in view stop measuring. While it marks, it holds back what the Server sends the page, so the older page cannot land first; it then lets the page through and watches the marked row every frame, until two seconds after the older page has landed. Per trial it reports:

| Field | Meaning |
| --- | --- |
| `maxDriftPx` | The furthest the marked row's top moved from where it was marked, from the mark to the end of the window |
| `driftedFrames` | Frames the marked row sat more than 2 px from where it was marked: one is a flicker, many is a slide |
| `finalDriftPx` | How far it had moved when the window ended |
| `anchorKept` | Whether the marked row is still in the document |
| `extentGrowthPx` | How much taller the Feed's scrollable extent became: proof an older page landed |
| `scrollTopShiftPx` | How far the Feed's scroll position moved |
| `endReached` | Whether the Feed ended at its newest row, which is the slide #1543 recorded |

The drift is reported, not judged: a run in which the anchor holds reads `maxDriftPx` near zero, and a regression reads as a number. `PERF_RUNS` sets the trials (default 3) and `PERF_CPU` the slowdowns. A trial where the older page lands before the row is marked, or never lands, is `failed` and stays in the report. The 100-row tier fits one page, so there is no older page and the scenario is `notApplicable` there. The hold delays every Server message for under a second, so the older page's latency is not what this measures; `feed-page-ready` measures that.

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
| PF-21 diff | `diff-small-ready`, `diff-large-ready` | browser | Changes overview press → first row of the diff drawn in the Changes list: the first removed line, since every line changes and git lists removed lines before added ones. One 8-line changed file, or one 2,000-line changed file (every line changed), written into the Project's git repository by `diff-fixture.mts` |
| PF-23 search | `sessions-search-ready` | browser | Sessions search `input` event → a matching title drawn and a non-matching one gone, over the seeded Sessions |
| PF-13, scripted only | `turns-concurrent-1-scripted`, `-2-`, `-4-` | driver | Send pressed together in N Sessions → this Turn's prompt answered with the fixture's reply in each Feed and Stop not drawn, on every page. Only the slowest Session's finish; 1x only |
| PF-14 | `attachment-{preview,upload}-{text,image}-{small,large}-ready` | driver | Preview: file chooser selection → preview in the Composer. Upload: Send → the Server answers the Blob with every byte. Files are random synthetic content, new each trial |

Server restart scenarios restart the one Server of the run and leave it on the same port.
Browser CPU slowdown reaches only the first page. A scenario it cannot reach (`server-restart-ready`, `turns-concurrent-*-scripted`) is recorded `notApplicable`, with its reason, at any slowdown other than 1x, and never as a measurement.
An unset `PERF_ONLY` plans all of them, so a default elapsed run is now much longer; name the scenarios to run fewer.

## Reading these scenarios

- The cold and server-restart scenarios take the same warm-ups and repetitions as the rest. #1461 asks for five independent cold trials, so run them with `PERF_RUNS=5`.
- `server-restart-reconnected` and `-usable` start their clock when the restart call returns, because the restart cannot be hooked at its ready instant. A near-zero sample can mean the App reconnected before the clock started.
- The touch scenarios' raw `driver` samples include the whole swipe gesture, about 400 ms. Read the browser summary, which the table prints.
- `turns-concurrent-*-scripted` and the soak use the scripted fixture Agent. They are App and Server evidence only, not PF-13 or real-Turn soak evidence.
- Soak `cpuPercent` is `ps pcpu`, which on macOS is a decayed average over the process's life, not current CPU. Use the heap, node and process counts for growth, and treat CPU as indicative.
- PF-03 was designed around #1434 (desktop "Try again"). These scenarios restart the Server by supervising the process, not through the App's retry button, so they do not exercise that fix.
- The diff scenarios commit two files to the seeded Project's git repository and set `refs/remotes/origin/main`; later scenarios in the same run see that repository.

## What these scenarios do not cover

- **PF-01 first frame** and **PF-02 native foreground resume** have no web equivalent here. The native half needs a device run.
- **PF-13** with a real Agent: queue delay, provider contention, and per-Session CPU and memory. `turns-concurrent-*-scripted` uses the fixture Agent and is not PF-13 evidence.
- **PF-14** Agent receipt of the file, and a file the App rejects as too large: a rejected file shows as a timed-out preview, not as a size limit.
- **PF-02** the current Connection state after reopen.
- **PF-03** retry delay and any configuration reset.
- **PF-24** App CPU, and Server reads and subscriptions.
- **PF-23** stale results while typing: the whole query is filled at once.
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
