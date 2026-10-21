import type { LabelProps } from './label-props';

export const countLabel = {
  text: '3 items',
  icon: 'agent',
} satisfies LabelProps;

export const successLabel = {
  icon: 'pr-open',
  text: '#45',
  tone: 'success',
} satisfies LabelProps;

export const infoLabel = {
  icon: 'check',
  text: '2/5',
  tone: 'info',
} satisfies LabelProps;

export const dangerLabel = {
  icon: 'warning',
  text: 'Failed',
  tone: 'danger',
} satisfies LabelProps;

export const mergedLabel = {
  icon: 'pr-merged',
  text: '#46',
  tone: 'done',
} satisfies LabelProps;

export const queuedLabel = {
  icon: 'cycle',
  text: 'Waiting',
  tone: 'warning',
} satisfies LabelProps;

export const neutralLabel = {
  icon: 'check',
  text: 'Neutral',
  tone: 'neutral',
} satisfies LabelProps;

export const accentLabel = {
  icon: 'check',
  text: 'Accent',
  tone: 'accent',
} satisfies LabelProps;

export const textOnlyLabel = {
  text: 'v1.2.0',
  testID: 'label-text-only',
} satisfies LabelProps;
