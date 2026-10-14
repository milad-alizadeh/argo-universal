import { setTimeout as sleep } from 'node:timers/promises';
import type { InitializeResponse } from '@agentclientprotocol/sdk';
import type { AgentCheck } from '@repo/contracts';
import { createRejectionCounter } from '@repo/machine-log';
import type { AgentLaunchSubject, CheckAgentLaunch } from '..';
import { ResourceCleanupError } from '../../lib/resource-cleanup-error';
import { AcpAuthenticationStatus } from './auth-status';
import {
  answerTimeoutMs,
  cantStart,
  CheckTimeout,
  describeError,
  describeKnownFailure,
  launchFailure,
} from './check-failure';
import { createAgentClient } from './client';
import { negotiateAcpInitialize } from './initialize';
import { closeLoginProcess } from './login-cleanup';
import { launchAcpProcess } from './process';
import type { AcpProcess } from './resource-types';
import { createAcpResponseReaders } from './response-readers';

const exitGraceMs = 1000;

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

const authenticationCheck = async (
  initialization: InitializeResponse,
  status: AcpAuthenticationStatus,
): Promise<AgentCheck> => {
  const result = await status.check(initialization);

  if (result.status === 'ready') return { status: 'ready' };

  return {
    status:
      result.status === 'authentication-required'
        ? 'sign-in-needed'
        : 'account-not-supported',
    reason: result.failure,
  };
};

// Whatever the authentication outcome, the Agent answered initialize, so its agentInfo version is known.
const checkAuthentication = async (
  initialization: InitializeResponse,
  status: AcpAuthenticationStatus,
): Promise<AgentCheck> => {
  const check = await authenticationCheck(initialization, status);
  const agentVersion = initialization.agentInfo?.version;

  return agentVersion ? { ...check, agentVersion } : check;
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

const hasExited = async (process: AcpProcess): Promise<boolean> =>
  (await Promise.race([
    process.exited.then((): 'exited' => 'exited'),
    after(exitGraceMs),
  ])) === 'exited';

const describeFailure = async (
  cause: unknown,
  process: AcpProcess,
  subject: AgentLaunchSubject,
): Promise<AgentCheck> => {
  const known = describeKnownFailure(cause, subject);

  if (known) return known;

  return cantStart(
    (await hasExited(process))
      ? `${subject.name} exited before answering ACP initialize.`
      : `${subject.name} failed ACP initialize: ${describeError(cause)}`,
  );
};

const whenCancelled = (signal?: AbortSignal): Promise<'cancelled'> =>
  new Promise((resolve) =>
    signal?.addEventListener('abort', () => resolve('cancelled'), {
      once: true,
    }),
  );

const answerOrTimeout = async (
  process: AcpProcess,
  timeoutMs: number,
  signal?: AbortSignal,
): Promise<AgentCheck> => {
  const answer = await Promise.race([
    initialize(process),
    after(timeoutMs),
    whenCancelled(signal),
  ]);

  if (answer === 'timeout') throw new CheckTimeout(timeoutMs);

  if (answer === 'cancelled')
    throw new DOMException('Readiness check was cancelled', 'AbortError');

  return answer;
};

// A cancelled check reports no Readiness: its caller decides what follows.
const describeUncancelled = (
  cause: unknown,
  process: AcpProcess,
  subject: AgentLaunchSubject,
): Promise<AgentCheck> => {
  subject.signal?.throwIfAborted();

  return describeFailure(cause, process, subject);
};

const launch = async (
  launchProcess: typeof launchAcpProcess,
  subject: AgentLaunchSubject,
): Promise<AcpProcess | AgentCheck> => {
  subject.signal?.throwIfAborted();

  try {
    return await launchProcess(subject.launch);
  } catch (error) {
    return launchFailure(error, subject);
  }
};

const stopChecked = (process: AcpProcess): Promise<void> =>
  closeLoginProcess(process).catch((cause: unknown) => {
    throw new ResourceCleanupError(process.exited, cause);
  });

// Starts the program, sends the shared ACP initialize and authentication check, and stops it; it opens no Session.
export const createAgentChecker =
  (
    launchProcess = launchAcpProcess,
    timeoutMs = answerTimeoutMs,
  ): CheckAgentLaunch =>
  async (subject): Promise<AgentCheck> => {
    const process = await launch(launchProcess, subject);

    if ('status' in process) return process;

    try {
      return await answerOrTimeout(process, timeoutMs, subject.signal);
    } catch (error) {
      return await describeUncancelled(error, process, subject);
    } finally {
      await stopChecked(process);
    }
  };

export const checkAgentLaunch = createAgentChecker();
