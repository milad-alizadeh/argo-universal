import {
  sessionOrigin,
  type SessionDirectory,
  type SessionOperationCall,
} from '../sessions';
import type {
  CallerImplementations,
  NativeStartImplementations,
  NewSessionId,
  OperationParams,
  OperationResult,
} from './implementations';
import {
  eachNativeStart,
  recordStartedWork,
  type NativeStartId,
} from './native-start';
import type { SessionCaller } from './session-tokens';

type SessionStart = {
  caller: SessionCaller;
  call: SessionOperationCall;
  directory: SessionDirectory;
  native: NativeStartImplementations;
};

async function startFromSession<Id extends NativeStartId>(
  { caller, call, directory, native }: SessionStart,
  { id, params }: { id: Id; params: OperationParams<Id> },
  start: NewSessionId,
): Promise<OperationResult<Id>> {
  const origin = sessionOrigin(
    caller.sessionId,
    directory.title(caller.sessionId),
  );

  const started = await native[id](params, { ...origin, ...start });

  return recordStartedWork(call, started);
}

export function sessionStarts(
  caller: Pick<SessionStart, 'caller' | 'call'>,
  directory: SessionDirectory,
  native: NativeStartImplementations,
): Pick<CallerImplementations<[NewSessionId]>, NativeStartId> {
  const source = { ...caller, directory, native };

  return eachNativeStart((id, params, start: NewSessionId) =>
    startFromSession(source, { id, params }, start),
  );
}
