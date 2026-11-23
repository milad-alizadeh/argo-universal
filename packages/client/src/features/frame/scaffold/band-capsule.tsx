import type { ReactElement } from 'react';
import { View, type ViewStyle } from 'react-native';
import type { BandRef } from '../hooks/band-motion-types';

// The capsule's room around its 32 buttons, inside the 36 pill.
export const capsulePadding = 2;

interface BandCapsuleProps {
  shown: boolean;
  motionRef: BandRef;
  // Where the pill runs inside its group: its buttons keep their place whether it shows or not.
  style: ViewStyle;
}

/*
 * A closed panel's controls float in the title bar on a pill behind their buttons; they stay ghost, so only a hover
 * tints them. The pill stays drawn and fades as the panel opens under the same buttons, which never move to make room.
 */
export function BandCapsule({
  shown,
  motionRef,
  style,
}: BandCapsuleProps): ReactElement {
  return (
    <View
      ref={motionRef}
      testID={shown ? 'window-band-capsule' : undefined}
      aria-hidden
      pointerEvents="none"
      className="absolute -inset-y-0.5 rounded-full bg-card shadow-capsule"
      style={[style, { opacity: Number(shown) }]}
    />
  );
}
