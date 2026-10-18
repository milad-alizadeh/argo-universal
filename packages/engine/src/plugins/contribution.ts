import type { PartVersions } from '@repo/contracts/plugins/kit';
import {
  slotPath,
  type PluginSlotInput,
  type SlotMessage,
} from '@repo/contracts/plugins/wire';
import { compatibleView } from './compatible-view';
import { merged } from './streams';
import type { PluginViews } from './views';

interface Contribution {
  pluginId: string;
  slot: PluginSlotInput;
  parts?: PartVersions;
}

export async function* contribution(
  views: PluginViews,
  { pluginId, slot, parts }: Contribution,
  signal: AbortSignal,
): AsyncGenerator<SlotMessage> {
  const path = slotPath(slot);

  for await (const message of compatibleView(
    views.watch(pluginId, { path, slot }, signal),
    parts,
  ))
    yield { type: 'view', pluginId, path, message };
}

interface Contributions {
  pluginIds: string[];
  slot: PluginSlotInput;
  parts?: PartVersions;
}

export async function* contributions(
  views: PluginViews,
  { pluginIds, slot, parts }: Contributions,
  signal: AbortSignal,
): AsyncGenerator<SlotMessage> {
  yield { type: 'contributors', pluginIds };
  yield* merged(
    pluginIds.map((pluginId) =>
      contribution(views, { pluginId, slot, parts }, signal),
    ),
  );
}
