import { handlerPath } from '@repo/contracts/plugins/action-handler-path';
import type { Handler, PluginInteraction } from '@repo/contracts/plugins/wire';
import type { RenderContext } from './plugin-rendering';

type Delivery = {
  handler?: Handler;
  interaction: PluginInteraction;
  context: RenderContext;
  throttleMs?: number;
};

export function deliverControl(input: Delivery): void | Promise<void> {
  const { handler, interaction, context } = input;

  if (!handler) return;

  if ('$event' in handler) return sendEvent(input, handler);

  return context.actions.run(handler, {
    key: context.key,
    path: handlerPath(interaction),
    send: context.dispatch,
  });
}

function sendEvent(
  input: Delivery,
  handler: Extract<Handler, { $event: string }>,
): void | Promise<void> {
  const { context, throttleMs } = input;

  const interaction = handler.$path
    ? nestedInteraction(input.interaction, handler.$path)
    : input.interaction;

  return context.ui.send(context.key, interaction, throttleMs);
}

function nestedInteraction(
  interaction: PluginInteraction,
  path: string[],
): PluginInteraction {
  const value =
    interaction.event === 'onAction'
      ? interaction.payload.value
      : interaction.payload;

  return { event: 'onAction', payload: { path, value } };
}
