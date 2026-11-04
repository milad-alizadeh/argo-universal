import { z } from 'zod';
import { maxPluginIdLength } from './plugin-identifier';
import { ReplaceableInput, ReplaceableSlotId } from './replaceable-input';
import { renderReasonLimit } from './replaceable-input';
import { WireNode } from './wire';

export * from './replaceable-input';

/*
 * A Replaceable Slot's one answer (ADR-0050): core draws its own with these props, or the Plugin tree a
 * `ui.render` Hook drew, checked as every Plugin tree is. New props are a new question.
 */
export const ReplaceableAnswer = z.discriminatedUnion('type', [
  z.strictObject({ type: z.literal('core'), input: ReplaceableInput }),
  z.strictObject({
    type: z.literal('replacement'),
    pluginId: z.string(),
    root: WireNode,
  }),
]);

export type ReplaceableAnswer = z.infer<typeof ReplaceableAnswer>;

// An App that could not draw a Plugin's replacement says so, and core draws the Slot instead.
export const RenderFailureInput = z.strictObject({
  pluginId: z.string().min(1).max(maxPluginIdLength),
  slotId: ReplaceableSlotId,
  reason: z.string().max(renderReasonLimit),
});

export type RenderFailureInput = z.infer<typeof RenderFailureInput>;
