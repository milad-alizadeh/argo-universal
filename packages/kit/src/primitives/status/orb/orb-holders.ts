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

export const withoutHolder = (holders: OrbHolder[], id: string): OrbHolder[] =>
  holders.filter((holder) => holder.id !== id);

function replaced(holders: OrbHolder[], holder: OrbHolder): OrbHolder[] {
  const held = holders.find(({ id }) => id === holder.id);

  if (asksTheSame(held, holder)) return holders;

  return holders.map((other) => (other === held ? holder : other));
}

/*
 * The orb that appeared last comes last, and the shared drawing takes its look. An orb that changes
 * its look keeps its place, so two orbs on screen at once never trade the drawing between them.
 */
export function withHolder(
  holders: OrbHolder[],
  holder: OrbHolder,
): OrbHolder[] {
  return holders.some(({ id }) => id === holder.id)
    ? replaced(holders, holder)
    : [...holders, holder];
}

// The orbs the shared drawing is not shown in: all but the one that appeared last. Each draws an orb of its own, so none is left empty.
export const displaced = (holders: OrbHolder[]): string[] =>
  holders.slice(0, -1).map(({ id }) => id);
