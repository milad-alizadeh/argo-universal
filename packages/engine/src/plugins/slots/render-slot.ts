import { JsonObject } from '@repo/contracts/plugins/hook-protocol';
import { drawsPluginWire } from '@repo/contracts/plugins/kit';
import {
  RenderAnswer,
  type ReplaceableInput,
  type ReplaceableMessage,
} from '@repo/contracts/plugins/replaceable';
import type { RpcConnection } from '../../rpc';
import type { StartedPlugins } from '../located-plugins';
import type { PluginRuntime } from '../runtime/plugin-runtime';
import { belowWireMinimum, type Fallback } from '../views/render-fallback';
import { renderView } from './render-view';

type RenderRequest = { input: ReplaceableInput; plugins: StartedPlugins };

export async function* renderSlot(
  runtime: PluginRuntime,
  request: RenderRequest,
  connection: RpcConnection,
): AsyncGenerator<ReplaceableMessage> {
  const answer = await renderAnswer(runtime, request, connection);

  if (connection.signal.aborted) return discardSelected(runtime, answer);

  yield* drawAnswer(runtime, { input: request.input, answer }, connection);
}

function coreInput(
  input: ReplaceableInput,
  answer: RenderAnswer,
): ReplaceableInput {
  return 'input' in answer ? answer.input : input;
}

const notRunning = (pluginId: string, slotId: string): Fallback => ({
  pluginId,
  slotId,
  reason: 'Plugin is not running',
});

async function renderAnswer(
  runtime: PluginRuntime,
  { input, plugins }: RenderRequest,
  connection: RpcConnection,
): Promise<RenderAnswer> {
  for (const pluginId of plugins.stopped)
    runtime.renderFallback(notRunning(pluginId, input.slotId));

  return RenderAnswer.parse(
    await runtime.hooks.run(
      { ...plugins, exempt: new Set(), surface: connection.surface },
      'ui.render',
      JsonObject.parse(JSON.parse(JSON.stringify(input))),
    ),
  );
}

type AnsweredRender = { input: ReplaceableInput; answer: RenderAnswer };

async function* drawAnswer(
  runtime: PluginRuntime,
  { input, answer }: AnsweredRender,
  connection: RpcConnection,
): AsyncGenerator<ReplaceableMessage> {
  if (!('pluginId' in answer))
    yield { type: 'core', input: coreInput(input, answer) };
  else if (drawsPluginWire(connection.surface))
    yield* renderView({
      runtime,
      replacement: { ...answer, input },
      connection,
    });
  else yield drawCoreForOlderApp(runtime, { ...answer, input });
}

type Selected = Extract<RenderAnswer, { pluginId: string }> & {
  input: ReplaceableInput;
};

// An App older than the wire minimum draws core's own in every Replaceable Slot (ADR-0034).
function drawCoreForOlderApp(
  runtime: PluginRuntime,
  { pluginId, path, input }: Selected,
): ReplaceableMessage {
  runtime.views.discardRender(pluginId, path);
  runtime.renderFallback({
    pluginId,
    slotId: input.slotId,
    reason: belowWireMinimum,
  });

  return { type: 'core', input };
}

function discardSelected(runtime: PluginRuntime, answer: RenderAnswer): void {
  if ('pluginId' in answer)
    runtime.views.discardRender(answer.pluginId, answer.path);
}
