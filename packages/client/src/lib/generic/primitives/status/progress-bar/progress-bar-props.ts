import type { Tone } from '#primitives/content/text';

export interface ProgressBarProps {
  value: number;
  tone?: Tone;
  active?: boolean;
  accessibilityLabel?: string;
  testID?: string;
}
