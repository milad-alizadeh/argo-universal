import type { OperationCard, SessionOperationCall } from '../../sessions';
import type { SessionInvoke } from '../implementations';
import type { SessionCaller } from '../session-tokens';

// The calling Session's Tool call asks the user when the Operation is outside its scope.
export type ScopedRun = {
  caller: SessionCaller;
  call: Pick<SessionOperationCall, 'confirm'>;
  invoke: SessionInvoke;
};

// The card is chosen inside the reservation, which is released once the Operation settles.
export type Admission = {
  card: () => OperationCard | undefined;
  release: () => void;
};

export const unreserved = (): void => {};

export const cardUnless = (
  covered: boolean,
  card: OperationCard,
): OperationCard | undefined => (covered ? undefined : card);

// Asks first when the caller's scope does not cover the call, then runs it.
export async function admitted<Result>(
  { call }: ScopedRun,
  admission: Admission,
  invoke: () => Promise<Result>,
): Promise<Result> {
  try {
    const card = admission.card();

    if (card) await call.confirm(card);

    return await invoke();
  } finally {
    admission.release();
  }
}
