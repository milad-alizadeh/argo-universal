import type { ReactNode } from 'react';
import type {
  OrbSeatHostProps,
  OrbSeat,
  SeatedOrbProps,
} from './orb-seat-props';

export const useOrbSeat = (): OrbSeat => null;

// There is no seat here, so the shared drawing has no canvas of its own.
export function SeatedOrb(_props: SeatedOrbProps): null {
  return null;
}

export function OrbSeatHost({ children }: OrbSeatHostProps): ReactNode {
  return children;
}
