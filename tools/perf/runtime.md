# Real Agent runtime durations

`perf:runtime` measures public Server phases with one Node `performance.now` clock.
It uses authenticated Operations and the same Feed subscription as the App.
It sends real prompts only with `--real-agent`.
CI uses the shared scripted ACP fixture instead.

## Run a diagnostic

1. Start a Server with a disposable home and Project through the normal CLI.
2. Create an idle Session with the required Agent, model, effort, and mode.
3. If you use `--reopen`, complete one initial Turn first. Closing an empty Session removes it.
4. Record the actual Server source commit and the host conditions.
5. Run the observer from the repository root:

```sh
pnpm --filter @repo/tools perf:runtime \
  --real-agent --home /tmp/argo-runtime/home --session SESSION_ID \
  --runs 10 --warmups 1 --cases sentinel,command,delay,cancel \
  --timeout-ms 120000 --reopen \
  --condition 'concurrent QA diagnostic, not baseline' --cache unknown \
  --server-commit SERVER_SHA --output /tmp/argo-runtime/results.json
```

For a baseline, reserve a quiet measurement window before the command.
`--cache warm|cold|unknown` records an operator declaration.
The optional `--cache-path` records path existence separately.
The observer does not clear caches, copy authentication files, or change Agent choices.
`--help` reads no Server or authentication files.

## Workloads and phases

Each trial has a unique identity and command marker.
The observer ignores earlier Turns, initial snapshots, and duplicate Feed revisions.
It correlates new content with the accepted Session, Turn, and matching command Tool.
A Feed reset or invalid append offset fails the observation.

| Case | Workload | Observed phases |
| --- | --- | --- |
| `sentinel` | Exact short reply without Tools | Operation acceptance, first Agent content, exact sentinel receipt, authoritative Turn end |
| `command` | Six exact output lines | Command Tool receipt, first Tool output, reported Tool completion, final sentinel, Turn end |
| `delay` | Six exact output lines with a one-second delay | Same command phases, separate from Agent planning time |
| `cancel` | One readiness line and a bounded 30-second command | Active Tool output trigger, cancellation acknowledgement, authoritative cancelled Turn |

The command workloads use Node stdout so the output bytes and delay remain portable.
The final Agent message must match the sentinel exactly.
Earlier commentary remains in the raw observations and first-content timing.
The complete final public Tool output must match every expected byte.
Missing first lines fail the trial even after a successful Tool or Turn completion.
A cancellation trigger that arrives after Tool completion fails the trial.

These phases cover the Server-observable parts of PF-06, PF-07, PF-08, PF-09, and PF-11.
They do not cover every workload in those cases.
File edits, pending Permission cancellation, and streaming-response cancellation need separate trials.
App presentation, Composer readiness, actual process start, process exit, and resource release remain unobserved.
Agent-reported Tool completion does not prove an operating-system process exit.

## Read the report

The observer saves the report before the first trial and after each completed, failed, or timed-out trial.
Warmups have a separate collection and do not enter sample summaries.
The report includes raw receipt times, phase durations, per-trial identities, final output, the expected reply, the configured timeout, and failure details.
Missing milestones remain `null`.
Successful workloads with inapplicable phases count as `unavailable`, not as failed or zero-duration phases.
Failed workloads retain their observed durations but do not enter successful latency percentiles.
The report includes p95 only after 20 successful samples.

`stdout.matches` and `replyMatches` describe separate results.
The report records Session choices before and after open, plus the final choices when available.
It also records Server identity, Installed Agent Registry version, observer commit, and dirty state.
The declared Server commit remains separate from the version that the Server reports.
An Installed Agent Registry version does not establish an unreported bundled SDK version.

`--timeout-ms` is a per-trial deadline that starts after the Session is prepared, when the prompt is about to be dispatched.
Preparing (reading, reopening and checking the Session) has its own fixed 10-second bound and never spends the trial's deadline, so a slow setup cannot time out the work being timed.
The deadline still covers dispatch, the wait for the Turn to end, and the final Feed read.

On failure or timeout, cleanup cancels only the same still-active Turn.
Cleanup has a separate deadline and never converts the failed trial into a successful sample.
Cleanup records public cancellation state, not operating-system process cleanup.
A nonzero exit retains the report and all failed samples.

## Regression checks

```sh
VITEST_MAX_WORKERS=1 pnpm exec vitest run --maxWorkers=1 \
  tools/perf/runtime-trial.integration.test.mts \
  tools/perf/runtime-failures.integration.test.mts
pnpm --filter @repo/tools check-types
```

The public integration checks cover replay exclusion, final-message selection, exact output, failure persistence, cancellation ordering, and timeout cleanup.
They start isolated fixture Servers and require no live Agent account.
