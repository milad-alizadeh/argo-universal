import type { SkImage } from '@shopify/react-native-skia';
import type { SharedValue } from 'react-native-reanimated';
import type { OrbSize, OrbState } from './orb-props';
import type { OrbSeat } from './orb-seat-props';

// The look an `OrbContinuity` draws, and where it keeps the image its orbs show.
export interface OrbDriverProps {
  image: SharedValue<SkImage | null>;
  seat: OrbSeat;
  state: OrbState;
  size: OrbSize;
}
