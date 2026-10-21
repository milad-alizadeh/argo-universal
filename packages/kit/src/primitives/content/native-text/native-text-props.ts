import type { TextProps } from '@expo/ui';
import type { TextRole, Tone } from '#primitives/content/text';

// The roles native text takes: Android draws each in Material's own type, iOS leaves the font to its container.
export type NativeTextRole = Extract<
  TextRole,
  'body' | 'secondary' | 'control' | 'heading'
>;

export interface NativeTextProps {
  children: string;
  role?: NativeTextRole;
  // Code reads in the mono face at the platform's own size.
  code?: boolean;
  // Android maps explicit tones through public colour props; untoned text inherits its container.
  tone?: Tone;
  numberOfLines?: number;
  // The caller's own placement and colour; the code face and danger colour win over them.
  modifiers?: TextProps['modifiers'];
}
