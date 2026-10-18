import { z } from 'zod';
import { ReplaceableInput } from './replaceable-input';
import { renderReasonLimit } from './replaceable-input';
import { ViewMessage } from './wire';
import { PluginViewInput, PluginViewId } from './wire-events';

export * from './replaceable-input';

export const ReplaceableMessage = z.discriminatedUnion('type', [
  z.strictObject({ type: z.literal('core'), input: ReplaceableInput }),
  z.strictObject({
    type: z.literal('replacement'),
    pluginId: z.string(),
    path: z.string(),
    message: ViewMessage,
  }),
]);

export type ReplaceableMessage = z.infer<typeof ReplaceableMessage>;

export const RenderFailureInput = PluginViewInput.extend({
  viewId: PluginViewId,
  revision: z.int().positive(),
  reason: z.string().max(renderReasonLimit),
});

export type RenderFailureInput = z.infer<typeof RenderFailureInput>;
