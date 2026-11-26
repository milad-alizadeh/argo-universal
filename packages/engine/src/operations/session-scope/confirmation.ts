import type { SessionOperationCall } from '../../sessions';
import type { SessionInvoke } from '../implementations';
import type { SessionCaller } from '../session-tokens';

// The calling Session's Tool call asks the user when the Operation is outside its scope.
export type ScopedRun = {
  caller: SessionCaller;
  call: Pick<SessionOperationCall, 'confirm' | 'canConfirm'>;
  invoke: SessionInvoke;
};
