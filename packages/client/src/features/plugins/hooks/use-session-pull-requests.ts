import {
  sessionChangesSlotId,
  type SlotContextOf,
  type SlotInputOf,
} from '@repo/contracts/plugins/wire';
import type { SessionPullRequest } from '#features/sessions';
import { sessionPullRequests } from '../utils/session-pull-requests';
import { itemsSlotEntry } from '../utils/slot-items';
import { useSlotReading } from './use-slot-reading';

export type ChangesContext = SlotContextOf<typeof sessionChangesSlotId>;

const sessionChangesSlot = itemsSlotEntry(sessionChangesSlotId);

const inputOf = (
  session: ChangesContext | undefined,
): SlotInputOf<typeof sessionChangesSlotId> | undefined =>
  session && { slotId: sessionChangesSlotId, contexts: [session] };

/*
 * The open Session's Changes the Plugins supplied, for its Workbench and Inspector to draw (ADR-0052). Argo's own
 * Working and Branch Changes come from the Checkout, never from here.
 */
export function useSessionPullRequests(
  session: ChangesContext | undefined,
): SessionPullRequest[] {
  return sessionPullRequests(
    useSlotReading(sessionChangesSlot, {
      input: inputOf(session),
      key: session?.sessionId,
    }),
  );
}
