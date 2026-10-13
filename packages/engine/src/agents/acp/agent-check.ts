import { setTimeout as sleep } from 'node:timers/promises';
import type { InitializeResponse } from '@agentclientprotocol/sdk';
import type { AgentCheck } from '@repo/contracts';
import { createRejectionCounter } from '@repo/machine-log';
import { z } from 'zod';
import type { AgentLaunchSubject, CheckAgentLaunch } from '..';
import { ResourceCleanupError } from '../../lib/resource-cleanup-error';
import { AcpAuthenticationStatus } from './auth-status';
import { createAgentClient } from './client';
import { negotiateAcpInitialize } from './initialize';
import { closeLoginProcess } from './login-cleanup';
import { launchAcpProcess } from './process';
import type { AcpProcess } from './resource-types';
import { createAcpResponseReaders } from './response-readers';

const answerTimeoutSeconds = 15;

const exitGraceMs = 1000;

const millisecondsPerSecond = 1000;

// An unreferenced timer, so a pending check never keeps the process alive.
const after = (milliseconds: number): Promise<'timeout'> =>
  sleep(milliseconds, 'timeout' as const, { ref: false });

const createCheckingClient = (
  process: AcpProcess,
  status: AcpAuthenticationStatus,
): ReturnType<typeof createAgentClient> => {
  return createAgentClient({
    stream: process.stream,
    acceptSessionUpdate: (): undefined => {},
    requestPermission: () => ({ outcome: { outcome: 'cancelled' } }),
    createElicitation: () => ({ action: 'cancel' }),
    acceptAuthStatus: (notification) => status.accept(notification),
    rejectAuthStatus: () => status.invalidate(),
  });
};

const authenticationState = (
  status: 'authentication-required' | 'account-rejected',
): 'required' | 'unverified' =>
  status === 'authentication-required' ? 'required' : 'unverified';

const checkAuthentication = async (
  initialization: InitializeResponse,
  status: AcpAuthenticationStatus,
): Promise<AgentCheck> => {
  const result = await status.check(initialization);

  if (result.status === 'ready') return { status: 'ready' };

  return {
    status: 'ready',
    authentication: authenticationState(result.status),
  };
};

const initialize = async (process: AcpProcess): Promise<AgentCheck> => {
  const status = new AcpAuthenticationStatus();
  const connection = createCheckingClient(process, status);

  const readers = createAcpResponseReaders(
    createRejectionCounter('ACP initialize check'),
  );

  return checkAuthentication(
    await negotiateAcpInitialize(connection.agent, readers),
    status,
  );
};

const spawnFailures = new Map([
  ['ENOENT', 'was not found.'],
  ['EACCES', 'cannot be run.'],
]);

// Node spawn errors carry a string `code`; every other thrown value has none.
const spawnErrorSchema = z.object({ code: z.string() });

const describeSpawnFailure = (
  cause: unknown,
  { launch }: AgentLaunchSubject,
): string | undefined => {
  const spawnError = spawnErrorSchema.safeParse(cause);
  const failure = spawnError.success && spawnFailures.get(spawnError.data.code);

  return failure ? `${launch.executable} ${failure}` : undefined;
};

const describeError = (cause: unknown): string =>
  cause instanceof Error ? cause.message : String(cause);

const hasExited = async (process: AcpProcess): Promise<boolean> =>
  (await Promise.race([
    process.exited.then((): 'exited' => 'exited'),
    after(exitGraceMs),
  ])) === 'exited';

const describeFailure = async (
  cause: unknown,
  process: AcpProcess,
  subject: AgentLaunchSubject,
): Promise<string> => {
  const spawnFailure = describeSpawnFailure(cause, subject);

  if (spawnFailure) return spawnFailure;

  if (await hasExited(process))
    return `${subject.name} exited before answering ACP initialize.`;

  return `${subject.name} failed ACP initialize: ${describeError(cause)}`;
};

const answerOrTimeout = async (process: AcpProcess): Promise<AgentCheck> => {
  const answer = await Promise.race([
    initialize(process),
    after(answerTimeoutSeconds * millisecondsPerSecond),
  ]);

  if (answer === 'timeout')
    throw new Error(`no answer within ${answerTimeoutSeconds} seconds`);

  return answer;
};

// Starts the program, sends the shared ACP initialize and stops it; readiness is never read from storage.
export const createAgentChecker =
  (launchProcess = launchAcpProcess): CheckAgentLaunch =>
  async (subject): Promise<AgentCheck> => {
    const process = await launchProcess(subject.launch);

    try {
      return await answerOrTimeout(process);
    } catch (error) {
      const failure = await describeFailure(error, process, subject);

      return { status: 'failed', failure };
    } finally {
      await closeLoginProcess(process).catch((cause: unknown) => {
        throw new ResourceCleanupError(process.exited, cause);
      });
    }
  };

export const checkAgentLaunch = createAgentChecker();
