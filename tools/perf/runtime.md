# Real Agent runtime durations

`perf:runtime` measures public Server phases with one Node `performance.now` clock.
It uses authenticated Operations and the same Feed subscription as the App.
It sends real prompts only with `--real-agent`.
CI uses the shared scripted ACP fixture instead.

Use `pnpm --filter @repo/tools perf:runtime --help` for options.

## Run a diagnostic

1. Start a Server with a disposable home and Project through the normal CLI.
2. Create an idle Session with the required Agent, model, effort, and mode.
3. With `--reopen`, Argo reloads the idle Agent before each trial.
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
