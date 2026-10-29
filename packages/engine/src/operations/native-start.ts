import type {
  OperationId,
  OperationWorkTarget,
} from '@repo/contracts/operations';
import type {
  NativeStart,
  SessionOperationCall,
  SessionOrigin,
} from '../sessions';
import type { OperationParams, OperationResult } from './implementations';

// The one list of Operations that start native work: a Session, or a Turn.
const nativeStartIds = [
  'session.new',
  'session.prompt',
] as const satisfies readonly OperationId[];

export type NativeStartId = (typeof nativeStartIds)[number];

export function isNativeStartOperation(id: OperationId): id is NativeStartId {
  return nativeStartIds.some((nativeId) => nativeId === id);
}

type NativeStarts<Args extends unknown[]> = {
  [Id in NativeStartId]: (
    params: OperationParams<Id>,
    ...args: Args
  ) => Promise<OperationResult<Id>>;
};

// Each native start, answered the one way a caller kind answers it; only this list names them.
export function eachNativeStart<Args extends unknown[]>(
  start: <Id extends NativeStartId>(
    id: Id,
    params: OperationParams<Id>,
    ...args: Args
  ) => Promise<OperationResult<Id>>,
): NativeStarts<Args> {
  return {
    'session.new': (params, ...args) => start('session.new', params, ...args),
    'session.prompt': (params, ...args) =>
      start('session.prompt', params, ...args),
  };
}

// A caller's origin, with a new Session's pre-allocated id and the signal that stops its admission.
export type NativeStartRequest = SessionOrigin & {
  sessionId?: string;
  signal?: AbortSignal;
};

export type AcceptedWork<Result> = { result: Result; turnId?: string };

// Started native work; only a caller that waits for admission reads `accepted`, so a detached creation is never read.
export type StartedWork<Result> = OperationWorkTarget & {
  accepted: () => Promise<AcceptedWork<Result>>;
};

export function startedWork<Accepted, Result>(
  kind: StartedWork<Result>['kind'],
  { sessionId, turnId, accepted }: NativeStart<Accepted>,
  accept: (value: Accepted) => AcceptedWork<Result>,
): StartedWork<Result> {
  return { kind, sessionId, turnId, accepted: () => accepted.then(accept) };
}

export async function acceptedResult<Result>(
  started: Promise<StartedWork<Result>>,
): Promise<Result> {
  const { result } = await (await started).accepted();

  return result;
}

// A Session caller's Tool call follows the opening Session, then the Turn its admission started.
export async function recordStartedWork<Result>(
  call: SessionOperationCall,
  { kind, sessionId, turnId, accepted }: StartedWork<Result>,
): Promise<Result> {
  if (kind === 'creation') call.started({ kind, sessionId, turnId });
  const admitted = await accepted();

  if (admitted.turnId !== undefined)
    call.started({ kind: 'turn', sessionId, turnId: admitted.turnId });

  return admitted.result;
}
