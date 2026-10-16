import { cloneElement, type ReactElement } from 'react';
import type { PressableProps } from 'react-native';

export type TriggerHandlers = Pick<
  PressableProps,
  'onPress' | 'onHoverIn' | 'onHoverOut'
>;

type TriggerAttributes = Pick<PressableProps, 'role' | 'disabled'>;

// The caller's own element, which the overlay's trigger draws; an overlay the app opens itself has none.
export type TriggerElement =
  | ReactElement<TriggerHandlers & TriggerAttributes>
  | undefined;

type Handler<Event> = ((event: Event) => void) | null | undefined;

function both<Event>(
  own: Handler<Event>,
  added: Handler<Event>,
): Handler<Event> {
  if (!added) return own;

  return (event) => {
    own?.(event);
    added(event);
  };
}

function defined(attributes: TriggerAttributes): TriggerAttributes {
  return {
    ...(attributes.role && { role: attributes.role }),
    ...(attributes.disabled != null && { disabled: attributes.disabled }),
  };
}

// The trigger adds the overlay's handlers and default attributes to its caller's element; the element's own run first and win.
export function triggerChild(
  child: TriggerElement,
  handlers: TriggerHandlers,
  attributes: TriggerAttributes = {},
): ReactElement | null {
  if (!child) return null;

  const own = child.props;

  return cloneElement(child, {
    ...defined(attributes),
    ...defined(own),
    onPress: both(own.onPress, handlers.onPress),
    onHoverIn: both(own.onHoverIn, handlers.onHoverIn),
    onHoverOut: both(own.onHoverOut, handlers.onHoverOut),
  });
}
