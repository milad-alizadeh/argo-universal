import { drawsPluginWire } from '@repo/contracts/plugins/kit';
import { updateArgoNode } from '@repo/contracts/plugins/prepare-tree';
import type { ViewMessage } from '@repo/contracts/plugins/wire';
import type { RpcConnection } from '../../rpc';
import type { OpenView } from './open-view';
import { preparedView } from './prepared-view';
import { messages } from './stream';

export function appView(
  view: OpenView,
  connection: RpcConnection,
  log: (line: string) => void,
): AsyncGenerator<ViewMessage> {
  const source = messages(view, connection.signal);

  if (view.opening.renderSlot) return source;

  if (!drawsPluginWire(connection.surface)) return updateArgo(source);

  return preparedView(source, (reason) =>
    log(`Plugin ${view.pluginId}: refused ${view.opening.path}: ${reason}`),
  );
}

// An App older than the wire minimum sees "Update Argo" in place of the page or Slot (ADR-0034).
async function* updateArgo(
  source: AsyncIterable<ViewMessage>,
): AsyncGenerator<ViewMessage> {
  for await (const message of source)
    if (message.type === 'snapshot')
      yield { ...message, root: updateArgoNode(message.root.key) };
}
