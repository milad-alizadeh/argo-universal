import { ReplaceableInput } from '@repo/contracts/plugins/replaceable';
import type { ReplaceableSlotId } from '@repo/contracts/plugins/wire';
import { createContext, useContext, type ReactNode } from 'react';
import type { OpenPluginPage } from '../plugin-actions';
import { PluginDrawingBoundary } from './plugin-drawing-boundary';
import { PluginTree, type OnPageCall } from './plugin-registry';
import type { ReplaceableState } from './replaceable-state';

export interface ReplaceableSlotProps {
  input: ReplaceableInput;
  renderCore: (input: ReplaceableInput) => ReactNode;
}

export interface ReplaceableSlotDrawing {
  // The Slots a Plugin may draw, from `replacedSlots`.
  replaced: readonly ReplaceableSlotId[];
  render: (props: ReplaceableSlotProps) => ReactNode;
}

// Draws a Replaceable Slot from the connected Server; with none, core draws the Slot.
export const ReplaceableSlotRenderer =
  createContext<ReplaceableSlotDrawing | null>(null);

export function ReplaceableSlot(props: ReplaceableSlotProps): ReactNode {
  const drawing = useContext(ReplaceableSlotRenderer);

  return drawing?.replaced.includes(props.input.slotId)
    ? drawing.render(props)
    : props.renderCore(props.input);
}

export interface ReplaceableSlotViewProps extends ReplaceableSlotProps {
  state: ReplaceableState;
  onOpenPage?: OpenPluginPage;
  // The Operations a replacement's Component events run (ADR-0050).
  onPageCall?: OnPageCall;
  onFallback: (reason: string) => void;
}

// The Server sends only a tree it has checked; a drawing that throws still falls back to core.
export function ReplaceableSlotView(
  props: ReplaceableSlotViewProps,
): ReactNode {
  return (
    <PluginDrawingBoundary
      resetKey={drawingKey(props)}
      fallback={props.renderCore(props.input)}
      onFallback={props.onFallback}
    >
      {slotDrawing(props)}
    </PluginDrawingBoundary>
  );
}

// A new answer is a new drawing, so a replacement that threw is tried again once the Server answers anew.
const drawingKey = ({ input, state }: ReplaceableSlotViewProps): string =>
  JSON.stringify([state.replacement ?? 'core', input]);

function slotDrawing(props: ReplaceableSlotViewProps): ReactNode {
  const root = props.state.replacement?.root;

  if (!root) return props.renderCore(coreInput(props));

  return (
    <PluginTree
      root={root}
      onOpenPage={props.onOpenPage}
      onPageCall={props.onPageCall}
    />
  );
}

// The props a Plugin passed on, for the same Slot only.
function coreInput({
  input,
  state,
}: ReplaceableSlotViewProps): ReplaceableInput {
  const parsed = ReplaceableInput.safeParse(state.input).data;

  return parsed?.slotId === input.slotId ? parsed : input;
}
