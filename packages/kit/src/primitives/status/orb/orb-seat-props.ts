import type { ReactNode } from 'react';

/*
 * The one element the shared orb's canvas lives in on the web. Each orb that shows the drawing takes
 * the element into its own place, so the canvas is never made anew and shows no empty frame between
 * one row's orb and the next. iOS and Android have none: there each orb draws a canvas of its own.
 */
export type OrbSeat = HTMLElement | null;

export interface SeatedOrbProps {
  seat: OrbSeat;
  // The canvas, drawn into the seat.
  children: ReactNode;
}

export interface OrbSeatHostProps {
  seat: OrbSeat;
  pixels: number;
  // The orb's own canvas, drawn where there is no seat to take.
  children: ReactNode;
}
