import { JsonObject } from '@repo/contracts/plugins/hook-protocol';
import { drawsPluginWire } from '@repo/contracts/plugins/kit';
import {
  RenderAnswer,
  type ReplaceableAnswer,
  type ReplaceableInput,
} from '@repo/contracts/plugins/replaceable';
import type { RpcConnection } from '../../rpc';
import type { StartedPlugins } from '../located-plugins';
import { checkedTree, type Checked } from '../pages/checked-tree';
import type { PluginRuntime } from '../runtime/plugin-runtime';
import { belowWireMinimum, type Fallback } from '../views/render-fallback';

type RenderRequest = { input: ReplaceableInput; plugins: StartedPlugins };

type Drawn = Extract<RenderAnswer, { pluginId: string }>;

/*
 * A Replaceable Slot's one answer (ADR-0050): the `ui.render` chain runs once and its tree, when a Hook
 * drew one, is checked as every Plugin tree is. Nothing is kept: new props are a new question. Core draws
 * its own when no Hook drew, the tree is refused, or the App is below the wire minimum, logged as such.
 */
export async function renderSlot(
  runtime: PluginRuntime,
  request: RenderRequest,
  connection: RpcConnection,
): Promise<ReplaceableAnswer> {
  const answer = await renderAnswer(runtime, request, connection);

  if (!('pluginId' in answer))
    return { type: 'core', input: coreInput(request.input, answer) };

  return drawnAnswer(runtime, { ...answer, input: request.input }, connection);
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

type Selected = Drawn & { input: ReplaceableInput };

function drawnAnswer(
  runtime: PluginRuntime,
  { pluginId, tree, input }: Selected,
  connection: RpcConnection,
): ReplaceableAnswer {
  const checked = checkedFor(connection, tree);

  if (checked.ok) return { type: 'replacement', pluginId, root: checked.root };

  runtime.renderFallback({
    pluginId,
    slotId: input.slotId,
    reason: checked.error,
  });

  return { type: 'core', input };
}

// An App older than the wire minimum draws core's own in every Replaceable Slot (ADR-0034).
const checkedFor = (connection: RpcConnection, tree: Drawn['tree']): Checked =>
  drawsPluginWire(connection.surface)
    ? checkedTree(tree, 'replacement')
    : { ok: false, error: belowWireMinimum };
