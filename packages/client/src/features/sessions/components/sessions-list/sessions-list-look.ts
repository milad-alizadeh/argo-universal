import { type List, cardSides } from '@repo/kit/primitives/lists/list';
import type * as React from 'react';
import type { SessionsLayout } from '../../stores/sessions-view';

type SessionsListLook = Pick<
  React.ComponentProps<typeof List>,
  'appearance' | 'onPhones' | 'padding'
>;

type Sides = Required<SessionsListLook>['padding'];

// The side space the web and the phones each hold around the rows.
interface SidePadding {
  web: Sides;
  phone: Sides;
}

// Web rows sit 8 in from the sidebar's left, and each row's own margin takes the right to 14.
const padded = { web: { compact: 4, wide: 2 }, phone: cardSides } as const;

const inset = { web: 0, phone: 0 } as const;

const looks = (
  appearance: 'grouped' | 'cards',
  { web, phone }: SidePadding,
): SessionsListLook => ({
  appearance: 'plain',
  padding: web,
  onPhones: { appearance, padding: phone },
});

/*
 * Web draws Session rows flat on the sidebar, with no card, edge or separator; phones keep their cards and grouped lists.
 * `inset` is for a list drawn inside another, whose sides already hold the inset.
 */
const lookByLayout = {
  compact: {
    padded: looks('grouped', padded),
    inset: looks('grouped', inset),
  },
  regular: {
    padded: looks('cards', padded),
    inset: looks('cards', inset),
  },
} satisfies Record<
  SessionsLayout,
  Record<'padded' | 'inset', SessionsListLook>
>;

export const sessionsListLook = (
  layout: SessionsLayout,
  held: 'padded' | 'inset' = 'padded',
): SessionsListLook => lookByLayout[layout][held];
