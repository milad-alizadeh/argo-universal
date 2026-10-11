import { setTimeout as sleep } from 'node:timers/promises';
import type { AgentCheck } from '@repo/contracts';
import { createRejectionCounter } from '@repo/machine-log';
import type { AgentLaunchSubject, CheckAgentLaunch } from '../agents';
import { createAgentClient } from './client';
import { negotiateAcpInitialize } from './initialize';
import { launchAcpProcess } from './process';
import type { AcpProcess } from './resource-types';
import { createAcpResponseReaders } from './response-readers';

const answerTimeoutSeconds = 15;
const exitGraceMs = 1000;
const millisecondsPerSecond = 1000;

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
  { launch }: AgentLaunchSubject,
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
  subject: AgentLaunchSubject,
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
export const checkAgentLaunch: CheckAgentLaunch = async (
  subject,
): Promise<AgentCheck> => {
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
