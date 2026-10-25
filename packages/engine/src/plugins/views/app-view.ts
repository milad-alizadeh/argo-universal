import { drawsPluginWire } from '@repo/contracts/plugins/kit';
import { updateArgoNode } from '@repo/contracts/plugins/prepare-tree';
import type { ViewMessage } from '@repo/contracts/plugins/wire';
import type { RpcConnection } from '../../rpc';
import type { OpenView } from './open-view';
import { preparedView } from './prepared-view';
import { logOnce, updateArgoKey, updateArgoLine } from './render-fallback';
import { prepareSlotTree } from './slot-tree';
import { messages } from './stream';

export function appView(
  view: OpenView,
  connection: RpcConnection,
  log: (line: string) => void,
): AsyncGenerator<ViewMessage> {
  const source = messages(view, connection.signal);

  if (view.draws.kind === 'replaceable') return source;

  if (!drawsPluginWire(connection.surface)) {
    logUpdateArgo(view, log);

    return replaceWithUpdateArgo(source);
  }

  return preparedSlot(view, source, log);
}

function logUpdateArgo(view: OpenView, log: (line: string) => void): void {
  const { pluginId, opening } = view;

  logOnce(
    log,
    updateArgoKey(pluginId, opening.path),
    updateArgoLine(pluginId, opening.path),
  );
}

function preparedSlot(
  view: OpenView,
  source: AsyncIterable<ViewMessage>,
  log: (line: string) => void,
): AsyncGenerator<ViewMessage> {
  return preparedView(
    source,
    (reason) =>
      log(`Plugin ${view.pluginId}: refused ${view.opening.path}: ${reason}`),
    slotPreparation(view, log),
  );
}

function slotPreparation(
  view: OpenView,
  log: (line: string) => void,
): NonNullable<Parameters<typeof preparedView>[2]> {
  const slotId = view.opening.slot?.slotId;

  return (root) =>
    prepareSlotTree(slotId, root, (type) =>
      log(`Plugin ${view.pluginId}: refused ${slotId} part ${type}`),
    );
}

// An App older than the wire minimum sees "Update Argo" in place of the page or Slot (ADR-0034).
async function* replaceWithUpdateArgo(
  source: AsyncIterable<ViewMessage>,
): AsyncGenerator<ViewMessage> {
  for await (const message of source)
    if (message.type === 'snapshot')
      yield { ...message, root: updateArgoNode(message.root.key) };
}
