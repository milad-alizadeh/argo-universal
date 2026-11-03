import type {
  ReplaceableAnswer,
  ReplaceableInput,
} from '@repo/contracts/plugins/replaceable';
import type { WireNode } from '@repo/contracts/plugins/wire';

// A Plugin's tree in a Replaceable Slot, and the Plugin that drew it.
export type SlotReplacement = { pluginId: string; root: WireNode };

// What a Replaceable Slot draws: core's own component with these props, or a Plugin's tree.
export type ReplaceableState = {
  input: ReplaceableInput;
  replacement: SlotReplacement | null;
};

export const coreSlotState = (input: ReplaceableInput): ReplaceableState => ({
  input,
  replacement: null,
});

// The Server's one answer for the Slot's props (ADR-0050): core with the props a Plugin passed on, or a tree.
export const replaceableState = (
  input: ReplaceableInput,
  answer: ReplaceableAnswer,
): ReplaceableState =>
  answer.type === 'core'
    ? coreSlotState(answer.input)
    : { input, replacement: { pluginId: answer.pluginId, root: answer.root } };
