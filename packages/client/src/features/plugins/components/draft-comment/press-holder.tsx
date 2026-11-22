import { useEffect, useRef } from 'react';
import type * as React from 'react';
import { Platform, View, type GestureResponderEvent } from 'react-native';

export type Press = 'pointer' | 'long';

type Holder = React.ComponentRef<typeof View>;

type Point = { x: number; y: number };

const slopPixels = 10;

const pointOf = ({ nativeEvent }: GestureResponderEvent): Point => ({
  x: nativeEvent.pageX,
  y: nativeEvent.pageY,
});

const distance = (from: Point, to: Point): number =>
  Math.hypot(to.x - from.x, to.y - from.y);

// On the web a key press or a click would run the node under it, which the author is commenting on, not using.
function useBlockedActivation(
  holder: React.RefObject<Holder | null>,
  on: boolean,
  pick: (holder: Holder, address: string) => void,
): void {
  useEffect(() => {
    const element = holder.current;

    const active =
      Platform.OS === 'web' && on && element instanceof Element
        ? element
        : null;

    const block = (event: Event): void => {
      if (
        event instanceof KeyboardEvent &&
        event.key !== 'Enter' &&
        event.key !== ' '
      )
        return;

      event.preventDefault();
      event.stopPropagation();

      if (
        event instanceof KeyboardEvent &&
        event.target instanceof HTMLElement
      ) {
        const address = event.target.dataset['draftCommentAddress'];

        if (address && holder.current) pick(holder.current, address);
      }
    };

    active?.addEventListener('click', block, true);
    active?.addEventListener('keydown', block, true);

    return (): void => {
      active?.removeEventListener('click', block, true);
      active?.removeEventListener('keydown', block, true);
    };
  }, [holder, on, pick]);
}

// A portaled menu item handles its own selection.
function isInsideHolder(
  holder: Holder | null,
  event: GestureResponderEvent,
): boolean {
  if (Platform.OS !== 'web' || !(holder instanceof Element)) return true;

  const target: unknown = event.target;

  return !(target instanceof Element) || holder.contains(target);
}

export function PressHolder(props: {
  holder: React.RefObject<Holder | null>;
  press: Press;
  commenting: boolean;
  longPressMilliseconds: number;
  onPick: (holder: Holder, point: Point) => void;
  onPickAddress: (holder: Holder, address: string) => void;
  children: React.ReactNode;
}): React.JSX.Element {
  const { press, commenting, longPressMilliseconds, onPick, children } = props;
  const { holder } = props;
  const started = useRef({ at: 0, point: { x: 0, y: 0 }, moved: false });

  useBlockedActivation(holder, commenting, props.onPickAddress);

  const release = (event: GestureResponderEvent): void => {
    const { at, point, moved } = started.current;
    const long = event.nativeEvent.timestamp - at >= longPressMilliseconds;

    if (holder.current && !moved && (press === 'pointer' || long))
      onPick(holder.current, point);
  };

  return (
    <View
      ref={holder}
      className="min-h-0 flex-1"
      onStartShouldSetResponderCapture={(event) =>
        commenting && isInsideHolder(holder.current, event)
      }
      onResponderGrant={(event) => {
        started.current = {
          at: event.nativeEvent.timestamp,
          point: pointOf(event),
          moved: false,
        };
      }}
      onResponderMove={(event) => {
        if (distance(started.current.point, pointOf(event)) > slopPixels)
          started.current.moved = true;
      }}
      onResponderRelease={release}
    >
      {children}
    </View>
  );
}
