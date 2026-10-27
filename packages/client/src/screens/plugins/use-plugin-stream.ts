import type { PluginDispatchInput } from '@repo/contracts/plugins/wire';
import { useMutation } from '@tanstack/react-query';
import { useSubscription } from '@trpc/tanstack-react-query';
import { useState } from 'react';
import { useResubscribeOnReconnect, useTRPC } from '#features/connection';
import type { OpenPluginPage } from '../../lib/product/plugin-actions';
import type {
  ContributedView,
  PluginOnEvent,
} from '../../lib/product/plugin-registry';
import { usePluginOpener } from './use-plugin-opener';

type TRPC = ReturnType<typeof useTRPC>;

type Subscription<Message, Failure> = Parameters<
  typeof useSubscription<Message, Failure>
>[0];

type Subscribe<Input, Message, Failure> = (
  trpc: TRPC,
  input: Input,
  onData: (message: Message) => void,
) => Subscription<Message, Failure>;

// What a stream draws before its first message, and how each message changes it.
export interface PluginStreamReducer<Message, State> {
  initial: State;
  reduce: (state: State, message: Message) => State;
}

export interface PluginStream<State> {
  state: State;
  // The stream failed and has not restarted yet.
  failed: boolean;
}

/*
 * One Plugin stream from the connected Server, folded into what it draws. A new input or Connection starts it over
 * from `initial`; a stream that failed restarts once the Connection reopens.
 */
export function usePluginStream<Input, Message, State, Failure>(
  input: Input,
  subscribe: Subscribe<Input, Message, Failure>,
  reducer: PluginStreamReducer<Message, State>,
): PluginStream<State> {
  const trpc = useTRPC();
  const source = { trpc, key: JSON.stringify(input) };
  const { state, receive } = useStreamState(source, reducer);
  const subscription = useSubscription(subscribe(trpc, input, receive));
  useResubscribeOnReconnect(subscription);

  return { state, failed: subscription.status === 'error' };
}

type Source = { trpc: TRPC; key: string };

interface StreamState<Message, State> {
  state: State;
  receive: (message: Message) => void;
}

function useStreamState<Message, State>(
  source: Source,
  { initial, reduce }: PluginStreamReducer<Message, State>,
): StreamState<Message, State> {
  const [stored, store] = useState({ source, state: initial });

  const receive = (message: Message): void =>
    store((previous) => ({
      source,
      state: reduce(current(previous, source, initial), message),
    }));

  return { state: current(stored, source, initial), receive };
}

function current<State>(
  stored: { source: Source; state: State },
  { trpc, key }: Source,
  initial: State,
): State {
  return stored.source.trpc === trpc && stored.source.key === key
    ? stored.state
    : initial;
}

export interface PluginBinding {
  onEvent: PluginOnEvent;
  onOpenPage: OpenPluginPage;
}

type Dispatch = (input: PluginDispatchInput) => Promise<void>;

// Binds a drawn view to its Plugin: its events dispatch to that view, and its `navigate` Actions open that Plugin's pages.
export function usePluginBinding(): (drawn: ContributedView) => PluginBinding {
  // The Plugin tree's dispatcher reports a failure once, or the awaiting kit component does.
  const dispatch = useMutation(useTRPC().plugins.dispatch.mutationOptions());
  const opener = usePluginOpener();

  const send: Dispatch = async (input) => {
    await dispatch.mutateAsync(input);
  };

  return (drawn) => ({
    onEvent: viewDispatch(send, drawn),
    onOpenPage: opener(drawn.pluginId),
  });
}

// An event goes to the view and revision its tree was drawn from.
function viewDispatch(
  send: Dispatch,
  { pluginId, path, view: { revision, viewId } }: ContributedView,
): PluginOnEvent {
  return async (key, event) => {
    if (!viewId) throw new Error('Plugin view is not ready');
    await send({ pluginId, path, revision, viewId, key, ...event });
  };
}
