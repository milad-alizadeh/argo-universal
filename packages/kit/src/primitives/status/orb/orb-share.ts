import type { SkImage } from '@shopify/react-native-skia';
import { createContext } from 'react';
import type { SharedValue } from 'react-native-reanimated';
import type { OrbHolder } from './orb-holders';
import type { OrbSeat } from './orb-seat-props';

// How an orb asks the shared drawing for a look while it is on screen. Both stay the same for the life of an `OrbContinuity`.
export interface OrbAsks {
  join: (holder: OrbHolder) => void;
  leave: (id: string) => void;
}

// The one drawing the orbs under an `OrbContinuity` show.
export interface OrbShare extends OrbAsks {
  image: SharedValue<SkImage | null>;
  seat: OrbSeat;
  // The orb that asked last.
  holder: string | undefined;
}

export const OrbShareContext = createContext<OrbShare | null>(null);
