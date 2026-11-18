import type { OrbSize, OrbState } from './orb-props';

// An orb on screen that shows the one shared drawing, and the look it asks that drawing to take.
export interface OrbHolder {
  id: string;
  state: OrbState;
  size: OrbSize;
}

const lookOf = ({ id, state, size }: OrbHolder): string =>
  `${id} ${state} ${size}`;

const asksTheSame = (held: OrbHolder | undefined, holder: OrbHolder): boolean =>
  held !== undefined && lookOf(held) === lookOf(holder);

export const left = (holders: OrbHolder[], id: string): OrbHolder[] =>
  holders.filter((holder) => holder.id !== id);

// The holder that asked last comes last, and the shared drawing takes its look.
export function joined(holders: OrbHolder[], holder: OrbHolder): OrbHolder[] {
  if (asksTheSame(holders.at(-1), holder)) return holders;

  return [...left(holders, holder.id), holder];
}
