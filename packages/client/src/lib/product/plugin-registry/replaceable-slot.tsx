import { ReplaceableInput } from '@repo/contracts/plugins/replaceable';
import { createContext, useContext, type ReactNode } from 'react';
import type { OpenPluginPage } from '../plugin-actions';
import { PluginDrawingBoundary } from './plugin-drawing-boundary';
import { PluginTree, type PluginOnEvent } from './plugin-registry';
import type { ReplaceableState } from './plugin-stream-state';

export interface ReplaceableSlotProps {
  input: ReplaceableInput;
  renderCore: (input: ReplaceableInput) => ReactNode;
}

// Draws a Replaceable Slot from the connected Server; with none, core draws the Slot.
export const ReplaceableSlotRenderer = createContext<
  ((props: ReplaceableSlotProps) => ReactNode) | null
>(null);

export function ReplaceableSlot(props: ReplaceableSlotProps): ReactNode {
  const render = useContext(ReplaceableSlotRenderer);

  return render ? render(props) : props.renderCore(props.input);
}

export interface ReplaceableSlotViewProps extends ReplaceableSlotProps {
  state: ReplaceableState;
  onEvent: PluginOnEvent;
  onOpenPage?: OpenPluginPage;
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

function drawingKey({ input, state }: ReplaceableSlotViewProps): string {
  const view = state.replacement ? state.replacement.view.viewId : 'core';

  return JSON.stringify([view, input]);
}

function slotDrawing(props: ReplaceableSlotViewProps): ReactNode {
  const root = props.state.replacement?.view.root;

  if (!root) return props.renderCore(coreInput(props));

  return (
    <PluginTree
      root={root}
      onEvent={props.onEvent}
      onOpenPage={props.onOpenPage}
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
