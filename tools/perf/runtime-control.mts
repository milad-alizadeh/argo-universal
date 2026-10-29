import type { Turn } from '@repo/contracts';
import {
  OperationExecution,
  OperationRunResponse,
} from '@repo/contracts/operations/control';
import { readRuntimeSession } from './runtime-client.mts';
import type { RuntimeContext } from './runtime-context.mts';

async function prompt(context: RuntimeContext): Promise<OperationExecution> {
  const response = OperationRunResponse.parse(
    await context.client.mutation('operations.run', {
      id: 'session.prompt',
      params: {
        sessionId: context.target.sessionId,
        prompt: [{ type: 'text', text: context.workload.prompt }],
      },
      wait: false,
    }),
  );

  if (response.kind !== 'operation_execution')
    throw new Error('Prompt did not return native Turn identity');

  return response;
}

export async function dispatchRuntime(
  context: RuntimeContext,
): Promise<OperationExecution> {
  context.record.mark('dispatched');
  const response = await prompt(context);

  if (!response.turn) throw new Error('Prompt returned no Turn');
  context.record.result.operationId = response.id;
  context.record.accepted(response.turn);

  return response;
}

export async function settleRuntime(
  context: RuntimeContext,
  execution: OperationExecution,
): Promise<Turn> {
  let current = execution;

  while (current.status !== 'settled')
    current = await nextExecution(context, current);

  if (!current.turn) throw new Error('Operation did not return its Turn');
  context.record.result.turn = current.turn;
  context.record.mark('turn-ended');

  return current.turn;
}

function cancellationReady(context: RuntimeContext): Promise<void> | undefined {
  if (context.workload.cancelWhenAccepted) return Promise.resolve();

  return context.workload.cancelAfterStdout
    ? context.record.output.cancellationReady
    : undefined;
}

async function requireOwnedTurn(context: RuntimeContext): Promise<void> {
  const snapshot = await readRuntimeSession(
    context.client,
    context.target.sessionId,
  );

  if (snapshot.activeTurnId !== context.record.result.turn?.id)
    throw new Error(
      'The observed Turn is no longer active; cancellation skipped',
    );
}

async function cancelOwnedTurn(context: RuntimeContext): Promise<void> {
  await requireOwnedTurn(context);
  requireActiveTool(context);
  context.record.mark('cancel-dispatched');
  OperationRunResponse.parse(
    await context.client.mutation('operations.run', {
      id: 'session.cancel',
      params: { sessionId: context.target.sessionId },
      wait: false,
    }),
  );
  context.record.mark('cancel-acknowledged');
}

export async function cancelRuntime(
  context: RuntimeContext,
  ended: Promise<Turn>,
): Promise<void> {
  const ready = cancellationReady(context);

  if (!ready) return;
  await Promise.race([
    ready,
    ended.then(() => {
      throw new Error('Turn ended before the cancellation trigger');
    }),
  ]);
  await cancelOwnedTurn(context);
}

async function nextExecution(
  context: RuntimeContext,
  execution: OperationExecution,
): Promise<OperationExecution> {
  if (execution.status === 'waiting_for_user')
    throw new Error(
      'Turn is waiting for user input; unattended timing stopped',
    );

  return OperationExecution.parse(
    await context.client.mutation('operations.wait', { id: execution.id }),
  );
}

function requireActiveTool(context: RuntimeContext): void {
  if (!context.workload.cancelAfterStdout) return;

  const terminal = context.record.result.milestones.some(
    (event) => event.milestone === 'tool-completed',
  );

  context.record.result.activeToolAtCancel = !terminal;

  if (terminal)
    throw new Error(
      'Tool already terminal before cancellation trigger; trial refused',
    );
}
