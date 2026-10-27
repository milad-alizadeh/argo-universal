import { drawsPluginWire } from '@repo/contracts/plugins/kit';
import { updateArgoNode } from '@repo/contracts/plugins/prepare-tree';
import type { ViewMessage } from '@repo/contracts/plugins/wire';
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
  logUpdateArgo(view, log);

  return replaceWithUpdateArgo(source);
}

// Logged once when an App older than the wire minimum opens a page or ordinary Slot (ADR-0034).
function logUpdateArgo(
  { pluginId, opening }: OpenView,
  log: (line: string) => void,
): void {
  logOnce(
    log,
    [pluginId, 'update-argo', opening.path],
    `Plugin ${pluginId}: Update Argo ${opening.path}: ${belowWireMinimum}`,
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
