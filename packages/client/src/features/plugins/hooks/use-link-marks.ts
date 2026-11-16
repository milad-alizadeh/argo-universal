import {
  linkMarkSlotId,
  type SlotInputOf,
  type SlotItems,
} from '@repo/contracts/plugins/wire';
import {
  gitStateMark,
  type LinkMark,
} from '@repo/kit/primitives/overlays/link-preview';
import { useMemo } from 'react';
import { useSlotVisibility } from '#features/settings';
import {
  itemsSlotEntry,
  readSlotItems,
  type SlotReader,
} from '../utils/slot-items';
import { usePluginLookup } from './use-plugin-names';
import { useSlotItems } from './use-slot-items';

const markSlot = itemsSlotEntry(linkMarkSlotId);

type MarkInput = SlotInputOf<typeof linkMarkSlotId>;

const inputOf = (
  projectId: string | undefined,
  hrefs: readonly string[],
): MarkInput | undefined =>
  projectId && hrefs.length > 0
    ? {
        slotId: linkMarkSlotId,
        contexts: hrefs.map((href) => ({ href, projectId })),
      }
    : undefined;

// One link's mark: the state its Plugin answered, as Argo's own mark; none while no Plugin has answered.
function markOf(
  sent: SlotItems[string] | undefined,
  reader: SlotReader,
): LinkMark | null {
  const [answered] = readSlotItems(markSlot, sent, reader).items;

  return answered ? gitStateMark(answered.item) : null;
}

const marksOf = (
  hrefs: readonly string[],
  items: SlotItems,
  reader: SlotReader,
): ReadonlyMap<string, LinkMark | null> =>
  new Map(hrefs.map((href) => [href, markOf(items[href], reader)]));

// The marks of the links a Session page drew, live from the Plugins that keep those pull requests and Issues.
export function useLinkMarks(
  projectId: string | undefined,
  hrefs: readonly string[],
): ReadonlyMap<string, LinkMark | null> {
  const input = useMemo(() => inputOf(projectId, hrefs), [projectId, hrefs]);
  const { items } = useSlotItems(input);
  const visibility = useSlotVisibility(linkMarkSlotId);
  const lookup = usePluginLookup();

  return useMemo(
    () => marksOf(hrefs, items, { visibility, lookup }),
    [hrefs, items, visibility, lookup],
  );
}
