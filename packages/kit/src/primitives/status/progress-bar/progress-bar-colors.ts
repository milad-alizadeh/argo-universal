import type { Tone } from '#primitives/content/text';

export const progressColors = {
  neutral: { track: 'bg-foreground/15', fill: 'bg-foreground' },
  muted: { track: 'bg-muted-foreground/15', fill: 'bg-muted-foreground' },
  accent: { track: 'bg-accent/15', fill: 'bg-accent' },
  info: { track: 'bg-info/15', fill: 'bg-info' },
  success: { track: 'bg-success/15', fill: 'bg-success' },
  warning: { track: 'bg-warning/15', fill: 'bg-warning' },
  danger: { track: 'bg-danger/15', fill: 'bg-danger' },
  done: { track: 'bg-done/15', fill: 'bg-done' },
} satisfies Record<Tone, { track: string; fill: string }>;
