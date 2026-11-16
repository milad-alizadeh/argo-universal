import {
  projectDetailsSlotId,
  type ProjectDetailsItem,
  type SlotInputOf,
} from '@repo/contracts/plugins/wire';
import { itemsSlotEntry, type ReadItem } from '../utils/slot-items';
import { useSlotReading } from './use-slot-reading';

type DetailsInput = SlotInputOf<typeof projectDetailsSlotId>;

const projectDetailsSlot = itemsSlotEntry(projectDetailsSlotId);

const inputOf = (projectId: string | undefined): DetailsInput | undefined =>
  projectId === undefined
    ? undefined
    : { slotId: projectDetailsSlotId, contexts: [{ projectId }] };

/*
 * The rows the Plugins add to one Project's details, in Slot order, with each Plugin named. Project details has no
 * "+N" line: every row of a Plugin left on is drawn, so the overflow rows come too.
 */
export function useProjectDetailsItems(
  projectId: string | undefined,
): readonly ReadItem<ProjectDetailsItem>[] {
  const reading = useSlotReading(projectDetailsSlot, {
    input: inputOf(projectId),
    key: projectId,
  });

  return [...reading.items, ...reading.overflow];
}
