import type { SessionInfo } from '@repo/contracts';
import {
  sessionRowSlotId,
  type SlotContextOf,
  type SlotInputOf,
} from '@repo/contracts/plugins/wire';
import { useState } from 'react';
import type { RowSnapshot } from '../utils/session-row-cache';
import type { SentItems } from '../utils/slot-items';
import { useSlotItems } from './use-slot-items';

export type RowSession = Pick<SessionInfo, 'sessionId' | 'projectId'>;

export type RowContexts = SlotContextOf<typeof sessionRowSlotId>[];

const inputOf = (
  contexts: RowContexts | undefined,
): SlotInputOf<typeof sessionRowSlotId> | undefined =>
  contexts && { slotId: sessionRowSlotId, contexts };

// One batched call for the contexts, live from the Server; none while there are none to ask about.
export const useRowSnapshot = (
  contexts: RowContexts | undefined,
): RowSnapshot => useSlotItems(inputOf(contexts));

/*
 * The value from the first render with this key, so the contexts a subscription asks with change only when the
 * Sessions it asks about do, however the list orders or redraws them.
 */
export function useKeyed<Value>(key: string, value: Value): Value {
  const [held, setHeld] = useState({ key, value });

  if (held.key === key) return held.value;

  setHeld({ key, value });

  return value;
}

const contextsOf = (session: RowSession | undefined): RowContexts | undefined =>
  session && [{ sessionId: session.sessionId, projectId: session.projectId }];

const idOf = (session: RowSession | undefined): string =>
  session?.sessionId ?? '';

/*
 * The Session row Slot's answers for one Session, live from the Server, for the Settings preview; none while there is
 * no Session to ask about.
 */
export function useSentRowItems(session: RowSession | undefined): SentItems {
  const id = idOf(session);
  const { items } = useRowSnapshot(useKeyed(id, contextsOf(session)));

  return items[id];
}
