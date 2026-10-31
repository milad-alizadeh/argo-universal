import {
  projectDetailsSlotId,
  type ProjectDetailsItem,
  type SlotInputOf,
} from '@repo/contracts/plugins/wire';
import { useSlotVisibility } from '#features/settings';
import {
  itemsSlotEntry,
  readSlotItems,
  type ReadItem,
  type SentItems,
} from './slot-items';
import { usePluginLookup } from './use-plugin-names';
import { useSlotItems } from './use-slot-items';

const detailsSlot = itemsSlotEntry(projectDetailsSlotId);

type DetailsInput = SlotInputOf<typeof projectDetailsSlotId>;

const inputOf = (projectId: string | undefined): DetailsInput | undefined =>
  projectId === undefined
    ? undefined
    : { slotId: projectDetailsSlotId, contexts: [{ projectId }] };

// What the Plugins answered for the Project, as the Server sent it; none until the Project has loaded.
function useProjectItems(projectId: string | undefined): SentItems {
  const { items } = useSlotItems(inputOf(projectId));

  return projectId === undefined ? undefined : items[projectId];
}

/*
 * The rows the Plugins add to one Project's details, in Slot order, with each Plugin named. Project details has no
 * "+N" line: every row of a Plugin left on is drawn, so the overflow rows come too.
 */
export function useProjectDetailsItems(
  projectId: string | undefined,
): readonly ReadItem<ProjectDetailsItem>[] {
  const reading = readSlotItems(detailsSlot, useProjectItems(projectId), {
    visibility: useSlotVisibility(projectDetailsSlotId),
    lookup: usePluginLookup(),
  });

  return [...reading.items, ...reading.overflow];
}
