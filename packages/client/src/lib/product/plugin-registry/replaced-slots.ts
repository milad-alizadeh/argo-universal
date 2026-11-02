import type { PluginList } from '@repo/contracts/plugins';
import { rendersSlot } from '@repo/contracts/plugins/plugin-contributions';
import {
  replaceableSlots,
  type ReplaceableSlotId,
} from '@repo/contracts/plugins/wire';

// The Replaceable Slots some Plugin may draw on this Server; any other, the Server would only answer with core's own.
export const replacedSlots = ({ plugins }: PluginList): ReplaceableSlotId[] =>
  replaceableSlots
    .map(({ id }) => id)
    .filter((id) => plugins.some((plugin) => rendersSlot(plugin, id)));
