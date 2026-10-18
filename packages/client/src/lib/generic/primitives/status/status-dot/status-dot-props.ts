import type { Tone } from '#primitives/content/text';

export interface StatusDotProps {
  tone: Tone;
  size?: 'sm' | 'md';
  pulse?: boolean;
  className?: string;
  testID?: string;
  accessibilityLabel?: string;
}
