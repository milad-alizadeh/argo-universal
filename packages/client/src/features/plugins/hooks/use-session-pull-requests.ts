import {
  sessionChangesSlotId,
  type SlotContextOf,
  type SlotInputOf,
} from '@repo/contracts/plugins/wire';
import type { SessionPullRequest } from '#features/sessions';
import { sessionPullRequests } from '../utils/session-pull-requests';
import {
  itemsSlotEntry,
  readSlotItems,
  sentFor,
  type SentItems,
} from '../utils/slot-items';
import { useSlotItems } from './use-slot-items';
import { useSlotReader } from './use-slot-reader';

export type ChangesContext = SlotContextOf<typeof sessionChangesSlotId>;

const sessionChangesSlot = itemsSlotEntry(sessionChangesSlotId);

const inputOf = (
  session: ChangesContext | undefined,
): SlotInputOf<typeof sessionChangesSlotId> | undefined =>
  session && { slotId: sessionChangesSlotId, contexts: [session] };

interface SessionPullRequests {
  rows: SessionPullRequest[];
  canCreatePullRequest: boolean;
}

function hasAttachedPullRequest(sent: SentItems): boolean {
  const parsed = sessionChangesSlot.merged.safeParse(sent);

  if (!parsed.success) return false;

  return [...parsed.data.items, ...parsed.data.overflow].some(
    ({ item }) => item.pullRequest !== undefined,
  );
}

export function useSessionPullRequests(
  session: ChangesContext | undefined,
): SessionPullRequests {
  const { contexts, items } = useSlotItems(inputOf(session));
  const reader = useSlotReader(sessionChangesSlotId);
  const key = session?.sessionId;
  const sent = sentFor(items, key);

  return {
    rows: sessionPullRequests(readSlotItems(sessionChangesSlot, sent, reader)),
    canCreatePullRequest:
      contexts.some(({ sessionId }) => sessionId === key) &&
      !hasAttachedPullRequest(sent),
  };
}
