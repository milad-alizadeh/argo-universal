import { setTimeout as delay } from 'node:timers/promises';
import type { RunConfigurationStatus, RunStartResult } from '@repo/contracts';
import type { LiveRun } from './live-run';
import { readRunOutputTail } from './run-output';

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
