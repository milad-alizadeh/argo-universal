import type { SessionInfo } from '@repo/contracts';
import {
  sessionActivitySlotId,
  sessionRowSlotId,
  type SlotContextOf,
  type SlotInputOf,
} from '@repo/contracts/plugins/wire';
import { useState } from 'react';
import type { SentItems } from './slot-items';
import { type SlotItemsSnapshot, useSlotItems } from './use-slot-items';

export type RowSession = Pick<SessionInfo, 'sessionId' | 'projectId'>;

// The Sessions both Session row Slots are asked about; each takes the same context.
export type RowSlotId = typeof sessionRowSlotId | typeof sessionActivitySlotId;

export type RowContexts = SlotContextOf<RowSlotId>[];

// Both Session row Slots' latest snapshots for the same contexts.
export interface RowSnapshots {
  items: SlotItemsSnapshot<RowContexts[number]>;
  lines: SlotItemsSnapshot<RowContexts[number]>;
}

const inputOf = (
  slotId: RowSlotId,
  contexts: RowContexts | undefined,
): SlotInputOf<RowSlotId> | undefined => contexts && { slotId, contexts };

// One batched call per Slot for the contexts, live from the Server; none while there are none to ask about.
export function useRowSnapshots(
  contexts: RowContexts | undefined,
): RowSnapshots {
  return {
    items: useSlotItems(inputOf(sessionRowSlotId, contexts)),
    lines: useSlotItems(inputOf(sessionActivitySlotId, contexts)),
  };
}

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

// One Session's answers from both Session row Slots, as the Server sent them.
export interface SentRowItems {
  items: SentItems;
  lines: SentItems;
}

/*
 * Both Session row Slots' answers for one Session, live from the Server, for the Settings preview; none while there is
 * no Session to ask about.
 */
export function useSentRowItems(session: RowSession | undefined): SentRowItems {
  const id = idOf(session);
  const { items, lines } = useRowSnapshots(useKeyed(id, contextsOf(session)));

  return { items: items.items[id], lines: lines.items[id] };
}
