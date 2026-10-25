import { ReplaceableInput } from '@repo/contracts/plugins/replaceable';
import { replacementTreeReason } from '@repo/contracts/plugins/replacement-tree';
import type { WireNode } from '@repo/contracts/plugins/wire';
import { createContext, useContext, useEffect, type ReactNode } from 'react';
import { PluginDrawingBoundary } from './plugin-drawing-boundary';
import { PluginTree, type PluginOnEvent } from './plugin-registry';
import type { ReplaceableState } from './replaceable-state';

export interface ReplaceableSlotProps {
  input: ReplaceableInput;
  renderCore: (input: ReplaceableInput) => ReactNode;
}

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
  onFallback: (reason: string) => void;
}

export function ReplaceableSlotView(
  props: ReplaceableSlotViewProps,
): ReactNode {
  const { onFallback } = props;
  const refused = useTreeRefusal(props);

  return (
    <PluginDrawingBoundary
      resetKey={drawingKey(props)}
      fallback={props.renderCore(props.input)}
      onFallback={onFallback}
    >
      {slotDrawing(props, refused)}
    </PluginDrawingBoundary>
  );
}

function coreInput(
  { input, state }: ReplaceableSlotViewProps,
  refused: boolean,
): ReplaceableInput {
  if (refused) return input;
  const parsed = ReplaceableInput.safeParse(state.input).data;

  return matchingCore(input, parsed);
}

function useTreeRefusal(props: ReplaceableSlotViewProps): boolean {
  const root = replacementRoot(props.state);
  const reason = root ? replacementTreeReason(root) : null;
  const { onFallback } = props;
  useEffect(() => {
    if (reason) onFallback(reason);
  }, [reason, onFallback]);

  return Boolean(reason);
}

function drawingKey({ input, state }: ReplaceableSlotViewProps): string {
  const view = state.replacement ? state.replacement.view.viewId : 'core';

  return JSON.stringify([view, input]);
}

function slotDrawing(
  props: ReplaceableSlotViewProps,
  refused: boolean,
): ReactNode {
  const root = replacementRoot(props.state);

  if (!root || refused) return props.renderCore(coreInput(props, refused));

  return <PluginTree root={root} onEvent={props.onEvent} />;
}

function replacementRoot(state: ReplaceableState): WireNode | null | undefined {
  return state.replacement?.view.root;
}

function matchingCore(
  input: ReplaceableInput,
  parsed: ReplaceableInput | undefined,
): ReplaceableInput {
  if (!parsed) return input;

  return parsed.slotId === input.slotId ? parsed : input;
}
