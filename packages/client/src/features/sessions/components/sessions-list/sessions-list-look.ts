import { type List, cardSides } from '@repo/kit/primitives/lists/list';
import type * as React from 'react';
import type { SessionsLayout } from '../../stores/sessions-view';

type SessionsListLook = Pick<
  React.ComponentProps<typeof List>,
  'appearance' | 'density' | 'onPhones' | 'padding'
>;

type Sides = Required<SessionsListLook>['padding'];

// The side space the web and the phones each hold around the rows.
interface SidePadding {
  web: Sides;
  phone: Sides;
}

// Web rows keep the same inset on both sides of the sidebar.
const padded = { web: { compact: 2, wide: 1 }, phone: cardSides } as const;

const inset = { web: 0, phone: 0 } as const;

const compact = { density: 'compact', phones: 'grouped' } as const;

const regular = { density: 'regular', phones: 'cards' } as const;

type Drawing = Required<Pick<SessionsListLook, 'density'>> & {
  phones: 'grouped' | 'cards';
};

const looks = (
  { density, phones: appearance }: Drawing,
  { web, phone }: SidePadding,
): SessionsListLook => ({
  appearance: 'plain',
  density,
  padding: web,
  onPhones: { appearance, padding: phone },
});

/*
 * Web draws Session rows flat on the sidebar, with no card, edge or separator, and a Compact layout's rows as one line
 * each (the List's compact density); phones keep their cards and grouped lists.
 * `inset` is for a list drawn inside another, whose sides already hold the inset.
 */
const lookByLayout = {
  compact: {
    padded: looks(compact, padded),
    inset: looks(compact, inset),
  },
  regular: {
    padded: looks(regular, padded),
    inset: looks(regular, inset),
  },
} satisfies Record<
  SessionsLayout,
  Record<'padded' | 'inset', SessionsListLook>
>;

export const sessionsListLook = (
  layout: SessionsLayout,
  held: 'padded' | 'inset' = 'padded',
): SessionsListLook => lookByLayout[layout][held];
