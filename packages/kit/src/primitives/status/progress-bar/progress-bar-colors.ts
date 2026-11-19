import type { Tone } from '#primitives/content/text';

// A step bar's started step is its tone at 40%, the pale segment of Paper's step bar (Option A).
export const progressColors = {
  neutral: {
    track: 'bg-foreground/15',
    fill: 'bg-foreground',
    started: 'bg-foreground/40',
  },
  muted: {
    track: 'bg-muted-foreground/15',
    fill: 'bg-muted-foreground',
    started: 'bg-muted-foreground/40',
  },
  accent: { track: 'bg-accent/15', fill: 'bg-accent', started: 'bg-accent/40' },
  info: { track: 'bg-info/15', fill: 'bg-info', started: 'bg-info/40' },
  success: {
    track: 'bg-success/15',
    fill: 'bg-success',
    started: 'bg-success/40',
  },
  warning: {
    track: 'bg-warning/15',
    fill: 'bg-warning',
    started: 'bg-warning/40',
  },
  danger: { track: 'bg-danger/15', fill: 'bg-danger', started: 'bg-danger/40' },
  done: { track: 'bg-done/15', fill: 'bg-done', started: 'bg-done/40' },
} satisfies Record<Tone, { track: string; fill: string; started: string }>;
