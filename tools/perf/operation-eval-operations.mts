import type { Turn } from '@repo/contracts';
import {
  OperationExecution,
  OperationRunResponse,
} from '@repo/contracts/operations/control';
import type { Json } from '@repo/contracts/plugins/hook-protocol';
import { z } from 'zod';
import type { TurnStop } from './operation-eval-measure.mts';
import type { RuntimeClient } from './runtime-client.mts';

/*
 * The Operations the eval runs as the person, with the user token: it never asks, so setup and clean-up raise no
 * Permission request. Only the Agent under test runs Operations with a Session token.
 */
export type EvalOperation = {
  id: string;
  params: Record<string, Json>;
  // Wait for native work, such as a new Session, to settle; a Prompt is sent without waiting.
  wait: boolean;
};

export const runOperation = async (
  client: RuntimeClient,
  { id, params, wait }: EvalOperation,
): Promise<OperationRunResponse> =>
  OperationRunResponse.parse(
    await client.mutation('operations.run', { id, params, wait }),
  );

const settledResult = (execution: OperationExecution): Json => {
  if (execution.status !== 'settled')
    throw new Error(`${execution.id} is ${execution.status}`);

  return execution.result ?? null;
};

// What an Operation answered, at once or once its native work settled.
const resultOf = (response: OperationRunResponse): Json =>
  response.kind === 'result' ? response.result : settledResult(response);

const waited = async (
  client: RuntimeClient,
  id: string,
): Promise<OperationExecution> =>
  OperationExecution.parse(await client.mutation('operations.wait', { id }));

// Native work still running, such as a first Session that downloads its Agent, is waited on until it settles.
async function finalResponse(
  client: RuntimeClient,
  first: OperationRunResponse,
): Promise<OperationRunResponse> {
  let response = first;

  while (
    response.kind === 'operation_execution' &&
    response.status === 'still_running'
  )
    response = await waited(client, response.id);

  return response;
}

// Runs an Operation, waits for it, and reads its answer with the schema the Operation answers.
export async function answer<Answered extends z.ZodType>(
  client: RuntimeClient,
  operation: Omit<EvalOperation, 'wait'>,
  answered: Answered,
): Promise<z.infer<Answered>> {
  const response = await runOperation(client, { ...operation, wait: true });

  return answered.parse(resultOf(await finalResponse(client, response)));
}

export type Settled = { turn: Turn | null; stoppedBy: TurnStop | null };

const stopped = (stoppedBy: TurnStop): Settled => ({ turn: null, stoppedBy });

const unsettled = (
  status: OperationExecution['status'],
  deadline: number,
): Settled | null => {
  if (status === 'waiting_for_user') return stopped('waiting');

  return performance.now() > deadline ? stopped('timeout') : null;
};

// Where an execution stands: settled, waiting on the person, past the deadline, or still running (null).
function standing(
  execution: OperationExecution,
  deadline: number,
): Settled | null {
  if (execution.status === 'settled')
    return { turn: execution.turn ?? null, stoppedBy: null };

  return unsettled(execution.status, deadline);
}

const executionOf = (response: OperationRunResponse): OperationExecution => {
  if (response.kind !== 'operation_execution')
    throw new Error('The Prompt returned no Turn');

  return response;
};

// Waits for a Prompt's Turn, stopping at the deadline or when the Agent waits on the person.
export async function settle(
  client: RuntimeClient,
  first: OperationRunResponse,
  deadline: number,
): Promise<Settled> {
  let current = executionOf(first);

  let settled = standing(current, deadline);

  while (settled === null) {
    current = await waited(client, current.id);
    settled = standing(current, deadline);
  }

  return settled;
}

const listed = z.object({
  sessions: z.array(z.object({ sessionId: z.string() })),
});

// Closes a Session; one already closed refuses, which is fine before archiving.
const closed = async (
  client: RuntimeClient,
  sessionId: string,
): Promise<void> => {
  await runOperation(client, {
    id: 'session.close',
    params: { sessionId },
    wait: true,
  }).catch(() => null);
};

// Closes a Session, which an open Session needs before it archives, then archives it; true when it archived.
const archive = async (
  client: RuntimeClient,
  sessionId: string,
): Promise<boolean> => {
  await closed(client, sessionId);

  return runOperation(client, {
    id: 'session.archive',
    params: { sessionId },
    wait: true,
  }).then(
    () => true,
    () => false,
  );
};

// Archives every Session the eval left in its Project: its own, and the ones they started.
export async function archiveProject(
  client: RuntimeClient,
  projectId: string,
): Promise<number> {
  const { sessions } = await answer(
    client,
    { id: 'session.list', params: { projectId, archived: false } },
    listed,
  );

  let archived = 0;

  for (const { sessionId } of sessions)
    if (await archive(client, sessionId)) archived += 1;

  return archived;
}
