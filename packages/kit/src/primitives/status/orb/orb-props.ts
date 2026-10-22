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
  accessibilityLabel?: string;
}
