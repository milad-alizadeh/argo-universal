import { setTimeout as sleep } from 'node:timers/promises';
import type { AgentCheck, CustomAgentDefinition } from '@repo/contracts';
import { createRejectionCounter } from '@repo/machine-log';
import { createAgentClient } from '../acp/client';
import { negotiateAcpInitialize } from '../acp/initialize';
import { launchAcpProcess } from '../acp/process';
import type { AcpProcess, AgentLaunch } from '../acp/resource-types';
import { createAcpResponseReaders } from '../acp/response-readers';
import { createCustomAgentLaunch } from './custom-launch';

const answerTimeoutSeconds = 15;
const exitGraceMs = 1000;
const millisecondsPerSecond = 1000;
type CheckSubject = { name: string; launch: AgentLaunch };

// An unreferenced timer, so a pending check never keeps the process alive.
const after = (milliseconds: number): Promise<'timeout'> =>
  sleep(milliseconds, 'timeout' as const, { ref: false });
const initialize = async (process: AcpProcess): Promise<'answered'> => {
  const connection = createAgentClient({
    stream: process.stream,
    acceptSessionUpdate: (): undefined => {},
    requestPermission: () => ({ outcome: { outcome: 'cancelled' } }),
    createElicitation: () => ({ action: 'cancel' }),
  });
  const readers = createAcpResponseReaders(
    createRejectionCounter('ACP initialize check'),
  );
  await negotiateAcpInitialize(connection.agent, readers);
  return 'answered';
};
const spawnFailures = new Map<unknown, string>([
  ['ENOENT', 'was not found.'],
  ['EACCES', 'cannot be run.'],
]);
const readErrorCode = (error: unknown): unknown =>
  error instanceof Error && 'code' in error ? error.code : null;
const describeSpawnFailure = (
  error: unknown,
  { launch }: CheckSubject,
): string | undefined => {
  const failure = spawnFailures.get(readErrorCode(error));
  return failure && `${launch.executable} ${failure}`;
};
const describeError = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);
const hasExited = async (process: AcpProcess): Promise<boolean> =>
  (await Promise.race([
    process.exited.then((): 'exited' => 'exited'),
    after(exitGraceMs),
  ])) === 'exited';
const describeFailure = async (
  error: unknown,
  process: AcpProcess,
  subject: CheckSubject,
): Promise<string> => {
  const spawnFailure = describeSpawnFailure(error, subject);
  if (spawnFailure) return spawnFailure;
  if (await hasExited(process))
    return `${subject.name} exited before answering ACP initialize.`;
  return `${subject.name} failed ACP initialize: ${describeError(error)}`;
};
const answerOrTimeout = async (process: AcpProcess): Promise<void> => {
  const answer = await Promise.race([
    initialize(process),
    after(answerTimeoutSeconds * millisecondsPerSecond),
  ]);
  if (answer === 'timeout')
    throw new Error(`no answer within ${answerTimeoutSeconds} seconds`);
};

// Starts the program, sends the shared ACP initialize and stops it; readiness is never read from storage.
const checkAgentLaunch = async (subject: CheckSubject): Promise<AgentCheck> => {
  const process = await launchAcpProcess(subject.launch);
  try {
    await answerOrTimeout(process);
    return { status: 'ready' };
  } catch (error) {
    const failure = await describeFailure(error, process, subject);
    return { status: 'failed', failure };
  } finally {
    await process.terminate();
  }
};

export type CustomCheck = {
  agentId: string;
  definition: CustomAgentDefinition;
};

export const checkCustomDefinition = ({
  agentId,
  definition,
}: CustomCheck): Promise<AgentCheck> =>
  checkAgentLaunch({
    name: definition.name,
    launch: createCustomAgentLaunch({ agentId, definition }),
  });
