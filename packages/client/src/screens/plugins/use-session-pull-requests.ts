import {
  sessionChangesSlotId,
  type SlotContextOf,
  type SlotInputOf,
} from '@repo/contracts/plugins/wire';
import type { SessionPullRequest } from '#features/sessions';
import { useSlotVisibility } from '#features/settings';
import { sessionPullRequests } from './session-pull-requests';
import { itemsSlotEntry, readSlotItems, type SentItems } from './slot-items';
import { usePluginLookup } from './use-plugin-names';
import { useSlotItems } from './use-slot-items';

export type ChangesContext = SlotContextOf<typeof sessionChangesSlotId>;

const changesSlot = itemsSlotEntry(sessionChangesSlotId);

const inputOf = (
  session: ChangesContext | undefined,
): SlotInputOf<typeof sessionChangesSlotId> | undefined =>
  session && { slotId: sessionChangesSlotId, contexts: [session] };

// What the Plugins answer for one Session's Changes, live while the Session is open; none until it has loaded.
function useSentChanges(session: ChangesContext | undefined): SentItems {
  const { items } = useSlotItems(inputOf(session));

  return session && items[session.sessionId];
}

/*
 * The open Session's Changes the Plugins supplied, for its Workbench and Inspector to draw (ADR-0052). Argo's own
 * Working and Branch Changes come from the Checkout, never from here.
 */
export function useSessionPullRequests(
  session: ChangesContext | undefined,
): SessionPullRequest[] {
  return sessionPullRequests(
    readSlotItems(changesSlot, useSentChanges(session), {
      visibility: useSlotVisibility(sessionChangesSlotId),
      lookup: usePluginLookup(),
    }),
  );
}
