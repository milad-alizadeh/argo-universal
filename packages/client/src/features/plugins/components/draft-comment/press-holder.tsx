import { useRef } from 'react';
import type * as React from 'react';
import { View, type GestureResponderEvent } from 'react-native';

// A pointer picks on any press; a phone only on a long one.
export type Press = 'pointer' | 'long';

type Holder = React.ComponentRef<typeof View>;

/*
 * Takes every press on the page while the author comments, so the node pressed does not run, and reports where a
 * press that picks was let go. The sheet that opens on a pick is a child, laid over the page's box.
 */
export function PressHolder(props: {
  press: Press;
  commenting: boolean;
  longPressMilliseconds: number;
  onPick: (holder: Holder, point: { x: number; y: number }) => void;
  children: React.ReactNode;
}): React.JSX.Element {
  const { press, commenting, longPressMilliseconds, onPick, children } = props;
  const holder = useRef<Holder>(null);
  const pressedAt = useRef(0);

  const release = (event: GestureResponderEvent): void => {
    const { pageX, pageY, timestamp } = event.nativeEvent;
    const long = timestamp - pressedAt.current >= longPressMilliseconds;

    if (holder.current && (press === 'pointer' || long))
      onPick(holder.current, { x: pageX, y: pageY });
  };

  return (
    <View
      ref={holder}
      className="min-h-0 flex-1"
      onStartShouldSetResponderCapture={() => commenting}
      onResponderGrant={(event) => {
        pressedAt.current = event.nativeEvent.timestamp;
      }}
      onResponderRelease={release}
    >
      {children}
    </View>
  );
}
