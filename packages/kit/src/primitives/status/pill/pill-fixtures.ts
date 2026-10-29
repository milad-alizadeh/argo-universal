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

// Tracker labels in their own colours, as GitHub sends them: a light, a dark and a grey one among them.
export const labelPills = [
  { text: 'Feature', color: '#bb87fc' },
  { text: 'Bug', color: '#d73a4a' },
  { text: 'Feed', color: '#26b5ce' },
  { text: 'good first issue', color: '#7057ff' },
  { text: 'help wanted', color: '#fbca04' },
  { text: 'wontfix', color: '#ffffff' },
  { text: 'docs', color: '#0e1a2b' },
] as const satisfies readonly PillProps[];

export const controlPill = {
  variant: 'control',
  text: 'Choice',
  icon: 'settings',
  disclosure: 'down',
} satisfies PillProps;

export const countedControlPill = {
  variant: 'control',
  appearance: 'glass',
  text: 'Items',
  icon: 'terminal',
  count: 2,
  countTone: 'success',
} satisfies PillProps;

export const selectedControlPill = {
  ...controlPill,
  selected: true,
} satisfies PillProps;

export const disabledControlPill = {
  ...controlPill,
  disabled: true,
} satisfies PillProps;
