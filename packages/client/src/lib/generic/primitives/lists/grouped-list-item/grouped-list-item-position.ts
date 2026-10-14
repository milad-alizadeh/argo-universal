import { createContext } from 'react';

/*
 * Whether a virtualised list's row ends its section. The list holds each row in a container of
 * its own, where every row is a last child, so the row learns its place from here instead.
 */
export const GroupedListItemEnd = createContext<boolean | undefined>(undefined);

/*
 * A card row's place in its card. Each row is in a container of its own, so the row rounds its own
 * corners rather than relying on a wrapper's clip.
 */
export const GroupedListItemCorners = createContext<
  { first: boolean; last: boolean } | undefined
>(undefined);

/*
 * A virtualised list's hover link between neighbours: the row above a hovered or pressed row hides
 * its separator, as CSS cannot reach a previous row held in a container of its own.
 */
export interface RowHover {
  separatorHidden: boolean;
  onHover: (hovering: boolean) => void;
  onPressing: (pressing: boolean) => void;
}

export const GroupedListItemHover = createContext<RowHover | undefined>(
  undefined,
);
