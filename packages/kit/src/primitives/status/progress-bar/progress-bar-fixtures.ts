import type { ProgressBarProps } from './progress-bar-props';

export const runningProgressBar = {
  value: 0.4,
  tone: 'success',
  active: true,
  accessibilityLabel: 'Plan',
} satisfies ProgressBarProps;

export const waitingProgressBar = {
  value: 0.75,
  tone: 'warning',
  active: true,
  accessibilityLabel: 'Jobs',
} satisfies ProgressBarProps;

export const notStartedProgressBar = {
  value: 0,
  tone: 'muted',
  accessibilityLabel: 'Queued',
} satisfies ProgressBarProps;

export const completeProgressBar = {
  value: 1,
  tone: 'done',
  accessibilityLabel: 'Complete',
} satisfies ProgressBarProps;

export const failedProgressBar = {
  value: 0.4,
  tone: 'danger',
  accessibilityLabel: 'Failed',
} satisfies ProgressBarProps;

export const neutralProgressBar = {
  value: 0.5,
  tone: 'neutral',
} satisfies ProgressBarProps;

export const accentProgressBar = {
  value: 0.5,
  tone: 'accent',
} satisfies ProgressBarProps;

export const infoProgressBar = {
  value: 0.5,
  tone: 'info',
} satisfies ProgressBarProps;
