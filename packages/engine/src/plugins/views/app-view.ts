import { drawsPluginWire } from '@repo/contracts/plugins/kit';
import { updateRequiredNode } from '@repo/contracts/plugins/prepare-tree';
import type { ViewMessage } from '@repo/contracts/plugins/wire';
import { productName } from '@repo/contracts/product-identity';
import type { RpcConnection } from '../../rpc';
import type { OpenView } from './open-view';
import { belowWireMinimum, logOnce } from './render-fallback';
import { messages } from './stream';

// What one App reads of a view: the drawn tree, or "Update Argo" when the App is below the wire minimum.
export function appView(
  view: OpenView,
  connection: RpcConnection,
  log: (line: string) => void,
): AsyncGenerator<ViewMessage> {
  const source = messages(view, connection.signal);

  if (drawsPluginWire(connection.surface)) return source;
  logUpdateRequired(view, log);

  return replaceWithUpdateRequired(source);
}

// Logged once when an App older than the wire minimum opens a page or ordinary Slot (ADR-0034).
function logUpdateRequired(
  { pluginId, opening }: OpenView,
  log: (line: string) => void,
): void {
  logOnce(
    log,
    [pluginId, 'update-argo', opening.path],
    `Plugin ${pluginId}: Update ${productName} ${opening.path}: ${belowWireMinimum}`,
  );
}

// An App older than the wire minimum sees "Update Argo" in place of the page or Slot (ADR-0034).
async function* replaceWithUpdateRequired(
  source: AsyncIterable<ViewMessage>,
): AsyncGenerator<ViewMessage> {
  for await (const message of source)
    if (message.type === 'snapshot')
      yield { ...message, root: updateRequiredNode(message.root.key) };
}
