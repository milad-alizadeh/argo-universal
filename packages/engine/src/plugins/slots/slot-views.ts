import {
  slotPath,
  type PluginSlotInput,
  type SlotMessage,
} from '@repo/contracts/plugins/wire';
import type { RpcConnection } from '../../rpc';
import type { PluginViews } from '../views/plugin-views';
import { merged } from './merge-streams';

type Contributions = {
  pluginIds: string[];
  slot: PluginSlotInput;
  failed: (pluginId: string, slotId: string, reason: string) => void;
};

export async function* slotViews(
  views: PluginViews,
  { pluginIds, slot, failed }: Contributions,
  connection: RpcConnection,
): AsyncGenerator<SlotMessage> {
  const path = slotPath(slot);
  yield* merged(
    pluginIds.map((pluginId) =>
      contribution(views, { pluginId, path, slot }, connection),
    ),
    (index, reason) => failed(pluginIds[index] ?? '', path, reason),
  );
}

type Contribution = { pluginId: string; path: string; slot: PluginSlotInput };

async function* contribution(
  views: PluginViews,
  { pluginId, path, slot }: Contribution,
  connection: RpcConnection,
): AsyncGenerator<SlotMessage> {
  for await (const message of views.watch(pluginId, { path, slot }, connection))
    yield { type: 'view', pluginId, path, message };
}
