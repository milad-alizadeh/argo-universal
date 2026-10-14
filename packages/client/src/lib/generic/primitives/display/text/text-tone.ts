// What a colour means: Text and Icon draw each tone in the matching theme colour.
export type Tone =
  | 'neutral'
  | 'muted'
  | 'accent'
  | 'info'
  | 'success'
  | 'warning'
  | 'danger'
  | 'done';

export const toneText = {
  neutral: 'text-foreground',
  muted: 'text-muted-foreground',
  accent: 'text-accent',
  info: 'text-info',
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-danger',
  done: 'text-done',
} as const satisfies Record<Tone, string>;
