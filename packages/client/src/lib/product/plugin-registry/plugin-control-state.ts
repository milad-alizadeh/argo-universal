import { handlerPath } from '@repo/contracts/plugins/action-handler-path';
import type { Handler, PluginInteraction } from '@repo/contracts/plugins/wire';
import { useRef, useState, type MutableRefObject, type Dispatch } from 'react';
import type { RenderContext } from './plugin-rendering';

type Value = boolean | number | string | undefined;

type State<T> = { value: T; pending: boolean };

type Request<T> = {
  state: State<T>;
  setState: Dispatch<State<T>>;
  waiting: MutableRefObject<boolean>;
};

export interface ControlValue<T> extends State<T> {
  change: (next: T, deliver: () => void | Promise<void>) => Promise<void>;
}

// Drafts stay in the App across Server patches; failed acknowledgements restore the previous value.
export function useControlValue<T extends Value>(initial: T): ControlValue<T> {
  const [state, setState] = useState({ value: initial, pending: false });
  const waiting = useRef(false);

  return {
    ...state,
    change: (next, deliver) =>
      changeValue({ state, setState, waiting }, next, deliver),
  };
}

async function changeValue<T>(
  request: Request<T>,
  next: T,
  deliver: () => void | Promise<void>,
): Promise<void> {
  if (request.waiting.current) return;
  request.waiting.current = true;
  request.setState({ value: next, pending: true });
  const value = await acknowledgedValue(request.state.value, next, deliver);
  request.waiting.current = false;
  request.setState({ value, pending: false });
}

async function acknowledgedValue<T>(
  previous: T,
  next: T,
  deliver: () => void | Promise<void>,
): Promise<T> {
  try {
    await deliver();

    return next;
  } catch {
    return previous;
  }
}

export function deliverControl(
  handler: Handler | undefined,
  interaction: PluginInteraction,
  context: RenderContext,
): void | Promise<void> {
  if (!handler) return;

  if ('$event' in handler) return sendEvent(handler, interaction, context);

  return context.actions.run(handler, {
    key: context.key,
    path: handlerPath(interaction),
    send: context.dispatch,
  });
}

function sendEvent(
  handler: Extract<Handler, { $event: string }>,
  interaction: PluginInteraction,
  context: RenderContext,
): void | Promise<void> {
  if (!handler.$path) return context.onEvent(context.key, interaction);

  const value =
    interaction.event === 'onAction'
      ? interaction.payload.value
      : interaction.payload;

  return context.onEvent(context.key, {
    event: 'onAction',
    payload: { path: handler.$path, value },
  });
}
