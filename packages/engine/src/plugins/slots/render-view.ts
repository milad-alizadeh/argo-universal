import type {
  ReplaceableInput,
  ReplaceableMessage,
} from '@repo/contracts/plugins/replaceable';
import type { ViewMessage } from '@repo/contracts/plugins/wire';
import type { RpcConnection } from '../../rpc';
import type { PluginRuntime } from '../runtime/plugin-runtime';

type Replacement = { pluginId: string; path: string; input: ReplaceableInput };

type RenderStream = {
  runtime: PluginRuntime;
  replacement: Replacement;
  connection: RpcConnection;
};

/*
 * A Replaceable Slot's replacement, drawn whole by its view. The view closes when its tree is refused or
 * its Plugin stops, and core draws its own component from then on; an App that leaves gets nothing more.
 */
export async function* renderView({
  runtime,
  replacement,
  connection,
}: RenderStream): AsyncGenerator<ReplaceableMessage> {
  const { pluginId, path, input } = replacement;

  for await (const message of watchReplacement(
    runtime,
    replacement,
    connection,
  ))
    yield { type: 'replacement', pluginId, path, message };

  if (!connection.signal.aborted) yield { type: 'core', input };
}

function watchReplacement(
  runtime: PluginRuntime,
  replacement: Replacement,
  connection: RpcConnection,
): AsyncGenerator<ViewMessage> {
  return runtime.views.watch(
    replacement.pluginId,
    { path: replacement.path, renderSlot: replacement.input.slotId },
    connection,
  );
}
