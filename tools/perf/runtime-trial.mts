import type { Turn } from '@repo/contracts';
import { cleanupRuntime } from './runtime-cleanup.mts';
import { readRuntimeSession, readRuntimePage } from './runtime-client.mts';
import { runtimeContext, type RuntimeContext } from './runtime-context.mts';
import {
  dispatchRuntime,
  settleRuntime,
  cancelRuntime,
} from './runtime-control.mts';
import { runtimeError } from './runtime-error.mts';
import { prepareRuntime } from './runtime-prepare.mts';
import type {
  RuntimeTarget,
  RuntimeTrial,
  RuntimeWorkload,
} from './runtime-types.mts';
import { watchRuntime, type RuntimeWatch } from './runtime-watch.mts';

async function finishRuntime(
  context: RuntimeContext,
  watch: RuntimeWatch,
  turn: Turn,
): Promise<void> {
  const page = await readRuntimePage(context.client, context.target.sessionId);

  const rows = page.rows.filter(
    (row) =>
      row.sessionId === context.target.sessionId && row.turnId === turn.id,
  );

  await watch.drain(rows);
  context.record.finish(turn, rows, context.workload);
  await retainChoices(context);
}

async function measureRuntime(context: RuntimeContext): Promise<void> {
  const observation = await startWatch(context);

  try {
    const response = await dispatchRuntime(context);
    observation.watch.observe((timed) => context.record.receive(timed));
    const ended = settleRuntime(context, response);
    await cancelRuntime(context, ended);
    await finishRuntime(context, observation.watch, await ended);
  } finally {
    observation.stop();
  }
}

function failedRuntime(context: RuntimeContext, error: Error): void {
  context.record.result.status = context.signal.aborted
    ? 'timed-out'
    : 'failed';
  context.record.result.error = {
    phase: context.phase,
    message: error.message,
  };
}

async function attemptRuntime(context: RuntimeContext): Promise<void> {
  try {
    await prepareRuntime(context);
    context.startDeadline();
    context.phase = 'observe';
    await measureRuntime(context);
  } catch (error) {
    failedRuntime(context, runtimeError(error));
  }
}

// Every interval uses this observer's monotonic clock; Server-reported wall timestamps are never subtracted.
export async function observeRuntimeTurn(
  target: RuntimeTarget,
  workload: RuntimeWorkload,
): Promise<RuntimeTrial> {
  const context = runtimeContext(target, workload);

  try {
    await attemptRuntime(context);
    await cleanupRuntime(context);
  } finally {
    context.record.measurements();
    context.close();
  }

  return context.record.result;
}

async function retainChoices(context: RuntimeContext): Promise<void> {
  context.record.result.choices.after = (
    await readRuntimeSession(context.client, context.target.sessionId)
  ).configOptions;
}

function startWatch(context: RuntimeContext): ReturnType<typeof watchRuntime> {
  return watchRuntime(context.client, context.target.sessionId, context.signal);
}
