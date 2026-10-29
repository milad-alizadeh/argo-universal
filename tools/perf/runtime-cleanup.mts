import {
  OperationExecution,
  OperationRunResponse,
} from '@repo/contracts/operations/control';
import {
  readRuntimeSession,
  readRuntimePage,
  runtimeClient,
  type RuntimeClient,
} from './runtime-client.mts';
import type { RuntimeContext } from './runtime-context.mts';
import { runtimeError } from './runtime-error.mts';

async function retainFinal(
  context: RuntimeContext,
  client: RuntimeClient,
): Promise<void> {
  const turn = context.record.result.turn;

  if (!turn) return;
  const page = await readRuntimePage(client, context.target.sessionId);

  const rows = page.rows.filter(
    (row) =>
      row.turnId === turn.id && row.sessionId === context.target.sessionId,
  );

  context.record.retain(turn, rows);
}

async function cancelled(
  context: RuntimeContext,
  client: RuntimeClient,
): Promise<void> {
  const id = operationId(context);

  const result = OperationExecution.parse(
    await client.mutation('operations.wait', { id }),
  );

  if (result.status !== 'settled')
    throw new Error('Cleanup did not reach a terminal Turn');
  cleanupStatus(context, 'cancelled');

  retainCleanupTurn(context, result);
  await retainFinal(context, client);
}

async function cancelOwned(
  context: RuntimeContext,
  client: RuntimeClient,
): Promise<void> {
  const snapshot = await readRuntimeSession(client, context.target.sessionId);
  context.record.result.choices.after = snapshot.configOptions;

  if (snapshot.activeTurnId === null) {
    context.record.result.cleanup = { status: 'idle', atMs: performance.now() };
    await retainFinal(context, client);

    return;
  }

  await cancelActive(context, client, snapshot.activeTurnId);
}

async function cancelActive(
  context: RuntimeContext,
  client: RuntimeClient,
  active: string,
): Promise<void> {
  if (active !== context.record.result.turn?.id) {
    cleanupStatus(context, 'skipped');

    return;
  }

  await cancelRequest(context, client);
  await cancelled(context, client);
}

function needsCleanup(context: RuntimeContext): boolean {
  return (
    context.record.result.status !== 'completed' &&
    Boolean(context.record.result.turn)
  );
}

export async function cleanupRuntime(context: RuntimeContext): Promise<void> {
  if (!needsCleanup(context)) return;
  const connection = runtimeClient(context.target, AbortSignal.timeout(10_000));

  try {
    await cancelOwned(context, connection.client);
  } catch (cause) {
    context.record.result.cleanup = {
      status: 'failed',
      atMs: performance.now(),
      message: runtimeError(cause).message,
    };
  } finally {
    connection.close();
  }
}

function operationId(context: RuntimeContext): string {
  const id = context.record.result.operationId;

  if (!id) throw new Error('No observed Operation identity for cleanup');

  return id;
}

function retainCleanupTurn(
  context: RuntimeContext,
  result: OperationExecution,
): void {
  if (result.turn && context.record.result.cleanup)
    context.record.result.cleanup.turn = result.turn;
}

async function cancelRequest(
  context: RuntimeContext,
  client: RuntimeClient,
): Promise<void> {
  await client
    .mutation('operations.run', {
      id: 'session.cancel',
      params: { sessionId: context.target.sessionId },
      wait: false,
    })
    .then((value) => OperationRunResponse.parse(value));
}

function cleanupStatus(
  context: RuntimeContext,
  status: 'cancelled' | 'skipped',
): void {
  context.record.result.cleanup = { status, atMs: performance.now() };
}
