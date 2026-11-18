import type * as React from 'react';
import { type ReactNode, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { View } from 'react-native';
import type {
  OrbSeat,
  OrbSeatHostProps,
  SeatedOrbProps,
} from './orb-seat-props';

export function useOrbSeat(): OrbSeat {
  const [seat] = useState(() => document.createElement('div'));

  return seat;
}

export function SeatedOrb({ seat, children }: SeatedOrbProps): ReactNode {
  return seat && createPortal(children, seat);
}

type Host = React.ComponentRef<typeof View>;

const elementOf = (host: Host | null): HTMLElement | null =>
  host instanceof HTMLElement ? host : null;

// An orb that already holds the seat leaves it where it is, so the canvas is moved only when it changes place.
function moveTo(host: HTMLElement, seat: HTMLElement): void {
  if (seat.parentElement !== host) host.append(seat);
}

function seatIn(host: HTMLElement | null, seat: OrbSeat): void {
  if (host && seat) moveTo(host, seat);
}

export function OrbSeatHost(props: OrbSeatHostProps): React.JSX.Element {
  const { seat, pixels, seated } = props;
  const host = useRef<Host>(null);

  // A new orb takes the seat as it mounts, in the commit that removes the orb before it.
  useLayoutEffect(() => seatIn(elementOf(host.current), seat), [seat]);

  // An orb still on screen takes the seat back when the newer orb that held it leaves.
  useLayoutEffect(() => {
    if (seated) seatIn(elementOf(host.current), seat);
  }, [seat, seated]);

  return <View ref={host} style={{ width: pixels, height: pixels }} />;
}
