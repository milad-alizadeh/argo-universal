import { renderReasonLimit } from '@repo/contracts/plugins/replaceable';
import { useMutation } from '@tanstack/react-query';
import { useTRPC } from '#features/connection';
import {
  coreSlotState,
  reduceReplaceable,
  type ReplaceableState,
} from '../../lib/product/plugin-registry';
import {
  ReplaceableSlotView,
  type ReplaceableSlotProps,
  type ReplaceableSlotViewProps,
} from '../../lib/product/plugin-registry/replaceable-slot';
import { usePluginBinding, usePluginStream } from './use-plugin-stream';

export function renderConnectedReplaceableSlot(
  props: ReplaceableSlotProps,
): React.JSX.Element {
  return <ConnectedReplaceableSlot {...props} />;
}

// A Replaceable Slot as the connected Server answers it; a failed stream leaves core's own drawing.
function ConnectedReplaceableSlot(
  props: ReplaceableSlotProps,
): React.JSX.Element {
  const state = useReplaceableState(props.input);
  const actions = useSlotActions(state.replacement);

  return <ReplaceableSlotView {...props} {...actions} state={state} />;
}

type SlotActions = Pick<
  ReplaceableSlotViewProps,
  'onEvent' | 'onOpenPage' | 'onFallback'
>;

// What the Slot's drawing reports back: the replacement's events and `navigate` Actions, and a drawing that fell back.
function useSlotActions(
  replacement: ReplaceableState['replacement'],
): SlotActions {
  const onFallback = useDrawingFallback(replacement);
  const bind = usePluginBinding();

  return { onFallback, ...(replacement ? bind(replacement) : unbound) };
}

function useReplaceableState(
  input: ReplaceableSlotProps['input'],
): ReplaceableState {
  const { state, failed } = usePluginStream(
    input,
    (trpc, slot, onData) =>
      trpc.plugins.render.subscriptionOptions(slot, { onData }),
    { initial: coreSlotState(input), reduce: reduceReplaceable },
  );

  return failed ? coreSlotState(input) : state;
}

// Core draws the Slot, so there is no Plugin to send events to.
const unbound = { onEvent: (): void => {} };

function useDrawingFallback(
  replacement: ReplaceableState['replacement'],
): (reason: string) => void {
  const failure = useMutation(useTRPC().plugins.renderFailed.mutationOptions());

  return (reason) => {
    if (!replacement?.view.viewId) return;
    failure.mutate({
      pluginId: replacement.pluginId,
      path: replacement.path,
      viewId: replacement.view.viewId,
      revision: replacement.view.revision,
      reason: reason.slice(0, renderReasonLimit),
    });
  };
}
