// The six animations, each a different thing an Agent can be doing.
export type OrbState =
  | 'working'
  | 'searching'
  | 'solving'
  | 'listening'
  | 'composing'
  | 'shaping';

// Two tuned drawings, not one scaled: `sm` sits inline with text, `md` stands alone.
export type OrbSize = 'sm' | 'md';

export interface OrbProps {
  state?: OrbState;
  size?: OrbSize;
  paused?: boolean;
  // Shows the one orb its `OrbContinuity` draws, rather than an orb of its own: it carries on from the orb shown before it, and morphs from that orb's shape. Such an orb is never paused.
  continues?: boolean;
  accessibilityLabel?: string;
}
