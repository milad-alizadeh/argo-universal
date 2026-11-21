import { setTimeout as delay } from 'node:timers/promises';
import type { RunConfigurationStatus, RunStartResult } from '@repo/contracts';
import type { LiveRun } from './live-run';
import type { RunConfiguration } from './run-configurations';
import { readRunOutputTail } from './run-output';
import { portListening } from './run-ports';

const tailCharacters = 4000;

// Waits until the Run is ready, ends, or the time is up, and says how it stands: where it answers, or the end of its output.
export async function awaitReady(
  run: LiveRun,
  timeoutMs: number,
): Promise<RunStartResult> {
  const outcome = await Promise.race([
    run.ready.promise.then((): 'ready' => 'ready'),
    run.ended.promise.then((): 'ended' => 'ended'),
    delay(timeoutMs).then((): 'timeout' => 'timeout'),
  ]);

  const { record } = run;

  if (outcome === 'ready')
    return {
      ready: true,
      name: record.name,
      url: record.url,
      port: record.port,
    };

  await run.flushed();

  const status: RunConfigurationStatus = record.status;

  return {
    ready: false,
    name: record.name,
    status,
    exitCode: record.exitCode,
    tail: await readRunOutputTail(run.outputPath, tailCharacters),
  };
}

const readyPollMs = 100;

// A Run Configuration with no `ready` is ready once its port listens.
const readyPattern = ({ ready }: RunConfiguration): RegExp | undefined =>
  ready && 'pattern' in ready ? new RegExp(ready.pattern, 'u') : undefined;

export async function watchReadiness(
  run: LiveRun,
  current: () => boolean,
  markReady: () => Promise<void>,
): Promise<void> {
  const pattern = readyPattern(run.configuration);

  while (current() && !run.stopping) {
    const ready = pattern
      ? run.matches(pattern)
      : await portListening(run.record.port);

    if (ready && current() && !run.stopping) return markReady();
    await delay(readyPollMs);
  }
}
