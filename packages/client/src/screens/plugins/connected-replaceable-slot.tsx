import { renderReasonLimit } from '@repo/contracts/plugins/replaceable';
import { useMutation } from '@tanstack/react-query';
import { useSubscription } from '@trpc/tanstack-react-query';
import { useResubscribeOnReconnect, useTRPC } from '#features/connection';
import {
  ReplaceableSlotView,
  type ReplaceableSlotProps,
} from '../../lib/product/plugin-registry/replaceable-slot';
import {
  coreSlotState,
  reduceReplaceable,
  type ReplaceableState,
} from '../../lib/product/plugin-registry/replaceable-state';
import {
  bindPluginDispatch,
  usePluginDispatch,
  type PluginDispatch,
} from './use-plugin-dispatch';
import { usePluginOpener } from './use-plugin-opener';
import { usePluginStreamState } from './use-plugin-stream-state';

export function renderConnectedReplaceableSlot(
  props: ReplaceableSlotProps,
): React.JSX.Element {
  return <ConnectedReplaceableSlot {...props} />;
}

function ConnectedReplaceableSlot(
  props: ReplaceableSlotProps,
): React.JSX.Element {
  const state = useReplaceableState(props.input);
  const actions = useRenderActions(state);

  return <ReplaceableSlotView {...props} state={state} {...actions} />;
}

function useReplaceableState(
  input: ReplaceableSlotProps['input'],
): ReplaceableState {
  const trpc = useTRPC();

  const { value, receive } = usePluginStreamState(
    { trpc, key: JSON.stringify(input) },
    coreSlotState(input),
    reduceReplaceable,
  );

  const subscription = useSubscription(
    trpc.plugins.render.subscriptionOptions(input, { onData: receive }),
  );

  useResubscribeOnReconnect(subscription);

  return subscription.status === 'error' ? coreSlotState(input) : value;
}

function useDrawingFallback(state: ReplaceableState): (reason: string) => void {
  const failure = useMutation(useTRPC().plugins.renderFailed.mutationOptions());
  const replacement = state.replacement;

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

const ignoreEvent = (): void => {};

type RenderActions = Pick<
  React.ComponentProps<typeof ReplaceableSlotView>,
  'onEvent' | 'onFallback' | 'onOpenPage'
>;

function useRenderActions(state: ReplaceableState): RenderActions {
  const send = usePluginDispatch();
  const opener = usePluginOpener();

  return {
    onFallback: useDrawingFallback(state),
    onEvent: renderDispatch(send, state.replacement),
    onOpenPage: state.replacement
      ? opener(state.replacement.pluginId)
      : undefined,
  };
}

function renderDispatch(
  send: PluginDispatch,
  replacement: ReplaceableState['replacement'],
): React.ComponentProps<typeof ReplaceableSlotView>['onEvent'] {
  return replacement
    ? bindPluginDispatch(send, { ...replacement, ...replacement.view })
    : ignoreEvent;
}
