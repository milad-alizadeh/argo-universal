import {
  linkMarkSlotId,
  type SlotInputOf,
  type SlotItems,
} from '@repo/contracts/plugins/wire';
import { GitStateIcon } from '@repo/kit/primitives/overlays/link-preview';
import { useMemo, type ReactNode } from 'react';
import { useSlotVisibility } from '#features/settings';
import { itemsSlotEntry, readSlotItems, type SlotReader } from './slot-items';
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

// One link's mark: the state its Plugin answered, drawn as Argo's own icon; none while no Plugin has answered.
function markOf(
  sent: SlotItems[string] | undefined,
  reader: SlotReader,
): ReactNode {
  const [answered] = readSlotItems(markSlot, sent, reader).items;

  return answered ? <GitStateIcon data={answered.item} /> : null;
}

const marksOf = (
  hrefs: readonly string[],
  items: SlotItems,
  reader: SlotReader,
): ReadonlyMap<string, ReactNode> =>
  new Map(hrefs.map((href) => [href, markOf(items[href], reader)]));

// The marks of the links a Session page drew, live from the Plugins that keep those pull requests and Issues.
export function useLinkMarks(
  projectId: string | undefined,
  hrefs: readonly string[],
): ReadonlyMap<string, ReactNode> {
  const input = useMemo(() => inputOf(projectId, hrefs), [projectId, hrefs]);
  const { items } = useSlotItems(input);
  const visibility = useSlotVisibility(linkMarkSlotId);
  const lookup = usePluginLookup();

  return useMemo(
    () => marksOf(hrefs, items, { visibility, lookup }),
    [hrefs, items, visibility, lookup],
  );
}
