import type { List } from '@repo/kit/primitives/lists/list';
import type * as React from 'react';
import type { SessionsLayout } from '../../stores/sessions-view';

type SessionsListLook = Pick<
  React.ComponentProps<typeof List>,
  'appearance' | 'onPhones' | 'padding'
>;

// Paper "SessionsList": web rows sit 8 in from the sidebar's left, and each row's own margin takes the right to 14.
const webPadding = { compact: 4, wide: 2 } as const;

const phonePadding = { compact: 4, wide: 0 } as const;

const looks = (
  appearance: 'grouped' | 'cards',
  padding: SessionsListLook['padding'],
  onPhones: SessionsListLook['padding'],
): SessionsListLook => ({
  appearance: 'plain',
  padding,
  onPhones: { appearance, padding: onPhones },
});

/*
 * Web draws Session rows flat on the sidebar, with no card, edge or separator (Paper "Screen / 1 Porcelain · Ring · Regular"); phones keep their cards and grouped lists.
 * `inset` is for a list drawn inside another, whose sides already hold the inset.
 */
const lookByLayout = {
  compact: {
    padded: looks('grouped', webPadding, phonePadding),
    inset: looks('grouped', 0, 0),
  },
  regular: {
    padded: looks('cards', webPadding, phonePadding),
    inset: looks('cards', 0, 0),
  },
} satisfies Record<
  SessionsLayout,
  Record<'padded' | 'inset', SessionsListLook>
>;

export const sessionsListLook = (
  layout: SessionsLayout,
  held: 'padded' | 'inset' = 'padded',
): SessionsListLook => lookByLayout[layout][held];

export const standardTopPadding = { compact: 5, wide: 1 } as const;
