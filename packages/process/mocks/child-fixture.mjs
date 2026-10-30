import { spawn } from 'node:child_process';

/*
 * A child for lifecycle tests; its first argument picks what it does:
 * `serve` launches a descendant in its group, reports the descendant's pid and runs until stopped (ignoring SIGTERM with FIXTURE_IGNORE_TERM);
 * `fail` logs a taken port to stdout, as the Engine does, writes to stderr and exits with code 3; `environment` reports two variables and exits.
 */
const mode = process.argv[2];

function serve() {
  const descendant = spawn(
    process.execPath,
    ['-e', 'setInterval(() => {}, 1000)'],
    { stdio: 'ignore' },
  );

  if (process.env.FIXTURE_IGNORE_TERM) process.on('SIGTERM', () => {});
  process.send?.({ descendant: descendant.pid });
  setInterval(() => {}, 1000);
}

if (mode === 'serve') serve();

if (mode === 'fail') {
  process.stdout.write('could not listen: listen EADDRINUSE\n');
  process.stderr.write('Engine stopped\n');
  process.exitCode = 3;
}

if (mode === 'environment')
  process.send?.(
    {
      electron: process.env.ELECTRON_RUN_AS_NODE ?? null,
      value: process.env.FIXTURE_VALUE ?? null,
    },
    () => process.disconnect(),
  );
