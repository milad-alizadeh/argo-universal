import {
  messageSlotFixture,
  replacementTreeFixture,
  rewrittenMessage,
} from '@repo/contracts/plugins/replaceable-fixtures';
import { replacementState } from '../../../../mocks/replaceable-slot';
import type { ReplaceableSlotViewProps } from './replaceable-slot';
import { coreSlotState } from './replaceable-state';

// A story supplies the drawing and the spies; a fixture is the Slot's input and what a Plugin made of it.
type ReplaceableSlotFixture = Omit<
  ReplaceableSlotViewProps,
  'renderCore' | 'onEvent' | 'onFallback'
>;

// No Plugin has taken the Slot, so Argo's own drawing stands.
export const coreSlot = {
  input: messageSlotFixture,
  state: coreSlotState(messageSlotFixture),
} satisfies ReplaceableSlotFixture;

// A Plugin rewrote the Slot's props and Argo draws them with its own component.
export const rewrittenSlot = {
  input: messageSlotFixture,
  state: coreSlotState(rewrittenMessage()),
} satisfies ReplaceableSlotFixture;

// A Plugin sent a tree of its own, which replaces Argo's drawing.
export const replacedSlot = {
  input: messageSlotFixture,
  state: replacementState(replacementTreeFixture),
} satisfies ReplaceableSlotFixture;
