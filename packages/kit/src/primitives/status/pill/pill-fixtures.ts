import type { PillProps } from './pill-props';

const text = 'Ready';

export const neutralPill = { text, tone: 'neutral' } satisfies PillProps;

export const mutedPill = { text, tone: 'muted' } satisfies PillProps;

export const accentPill = { text, tone: 'accent' } satisfies PillProps;

export const infoPill = { text, tone: 'info' } satisfies PillProps;

export const successPill = { text, tone: 'success' } satisfies PillProps;

export const warningPill = { text, tone: 'warning' } satisfies PillProps;

export const dangerPill = { text, tone: 'danger' } satisfies PillProps;

export const donePill = { text, tone: 'done' } satisfies PillProps;
