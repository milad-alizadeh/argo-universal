import type { StatusDotProps } from './status-dot-props';

export const neutralStatusDot = { tone: 'neutral' } satisfies StatusDotProps;

export const mutedStatusDot = { tone: 'muted' } satisfies StatusDotProps;

export const accentStatusDot = { tone: 'accent' } satisfies StatusDotProps;

export const infoStatusDot = { tone: 'info' } satisfies StatusDotProps;

export const successStatusDot = { tone: 'success' } satisfies StatusDotProps;

export const warningStatusDot = { tone: 'warning' } satisfies StatusDotProps;

export const dangerStatusDot = { tone: 'danger' } satisfies StatusDotProps;

export const doneStatusDot = { tone: 'done' } satisfies StatusDotProps;

export const pulsingStatusDot = {
  tone: 'success',
  pulse: true,
} satisfies StatusDotProps;
