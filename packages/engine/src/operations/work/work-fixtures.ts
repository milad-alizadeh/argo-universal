import type { Turn } from '@repo/contracts';
import type { OperationId } from '@repo/contracts/operations';
import { TRPCError } from '@trpc/server';
import { MemorySessionWork } from '#mocks/memory-session-work';
import { TestOperationWaitClock } from '#mocks/operation-wait-clock';
import type {
  OperationCallRead,
  SessionOperationCall,
  SessionWork,
  SessionWorkRead,
} from '../../sessions';
import type { OperationRunResult } from '../implementations';
import type { OperationCaller, SessionCaller } from '../session-tokens';
import type { StartOperation } from './response';
import { OperationWork } from './work';

const sessionCaller: SessionCaller = {
  kind: 'session',
  sessionId: 'caller',
  projectId: 'p1',
};

const userCaller: OperationCaller = { kind: 'user' };

export const callerToken = 'caller-token';

const userToken = 'user-token';

export type WorkHost = {
  work: OperationWork;
  source: MemorySessionWork;
  clock: TestOperationWaitClock;
  // Revoking the Session token refuses its next read.
  revoke: () => void;
};

// Operation work on an in-memory Session work source and a test clock.
export function workHost(): WorkHost {
  const source = new MemorySessionWork();
  const clock = new TestOperationWaitClock();
  let revoked = false;

  const caller = (token: string | undefined): OperationCaller => {
    if (token === userToken) return userCaller;

    if (revoked) throw new TRPCError({ code: 'UNAUTHORIZED' });

    return sessionCaller;
  };

  const work = new OperationWork(
    { controlToken: 'control', source, clock },
    caller,
  );

  return { work, source, clock, revoke: () => (revoked = true) };
}

const toolCallId = 'tool-1';

export const callWork: SessionWork = {
  kind: 'call',
  sessionId: sessionCaller.sessionId,
  entityId: toolCallId,
};

export const turnWork = (sessionId: string, turnId: string): SessionWork => ({
  kind: 'turn',
  sessionId,
  entityId: turnId,
});

export const callRead = (call: OperationCallRead): SessionWorkRead => ({
  kind: 'call',
  call,
});

export function turnRead(
  { sessionId, entityId }: SessionWork,
  status: Turn['status'],
): SessionWorkRead {
  return {
    kind: 'turn',
    turn: { id: entityId, sessionId, status, ...turnEnding(status) },
    requiresInput: false,
  };
}

const turnEnding = (
  status: Turn['status'],
): Pick<Turn, 'stopReason' | 'model' | 'startedAt' | 'endedAt'> =>
  status === 'ended'
    ? { stopReason: 'end_turn', model: null, startedAt: 0, endedAt: 1 }
    : { stopReason: null, model: null, startedAt: 0, endedAt: null };

const recordedCall: SessionOperationCall = {
  toolCallId,
  canConfirm: true,
  confirm: async () => {},
  started: () => {},
  finish: () => {},
};

type SessionRun = {
  id: OperationId;
  wait: boolean;
  result: Promise<OperationRunResult>;
  signal?: AbortSignal;
};

// A Session caller's Operation, recorded as Tool call `tool-1`, whose result is the given promise.
export function runFromSession(
  { work }: WorkHost,
  { id, wait, result, signal }: SessionRun,
): Promise<OperationRunResult> {
  const input = { caller: sessionCaller, token: callerToken, wait, signal, id };

  return work.run(input, () => ({ call: recordedCall, result }));
}

// A user's Operation, whose start sees the admission it runs under.
export function runAsUser(
  { work }: WorkHost,
  {
    id,
    wait,
    start,
  }: { id: OperationId; wait: boolean; start: StartOperation },
): Promise<OperationRunResult> {
  return work.run({ caller: userCaller, token: userToken, wait, id }, start);
}

export const never = new Promise<never>(() => {});
