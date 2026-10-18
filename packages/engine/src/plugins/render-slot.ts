import { JsonObject } from '@repo/contracts/plugins/hook-protocol';
import {
  RenderAnswer,
  type ReplaceableInput,
  type ReplaceableMessage,
} from '@repo/contracts/plugins/replaceable';
import type { RpcConnection } from '../rpc';
import type { StartedPlugins } from './plugin-activation';
import { renderView } from './render-view';
import type { PluginRuntime } from './runtime';

type RenderRequest = { input: ReplaceableInput; plugins: StartedPlugins };

export async function* renderSlot(
  runtime: PluginRuntime,
  request: RenderRequest,
  connection: RpcConnection,
): AsyncGenerator<ReplaceableMessage> {
  const answer = await renderAnswer(runtime, request, connection);

  if ('pluginId' in answer)
    yield* renderView({
      runtime,
      replacement: { ...answer, input: request.input },
      connection,
    });
  else yield { type: 'core', input: coreInput(request.input, answer) };
}

function coreInput(
  input: ReplaceableInput,
  answer: RenderAnswer,
): ReplaceableInput {
  return 'input' in answer ? answer.input : input;
}

async function renderAnswer(
  runtime: PluginRuntime,
  { input, plugins }: RenderRequest,
  connection: RpcConnection,
): Promise<RenderAnswer> {
  for (const pluginId of plugins.stopped)
    runtime.renderFallback(pluginId, input.slotId, 'Plugin is not running');

  return RenderAnswer.parse(
    await runtime.hooks.run(
      { ...plugins, exempt: new Set(), surface: connection.surface },
      'ui.render',
      JsonObject.parse(JSON.parse(JSON.stringify(input))),
    ),
  );
}
