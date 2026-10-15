import type { TextProps } from '@expo/ui';
import type { TextRole, Tone } from '#primitives/display/text';

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
  // Only danger draws here, in Argo's colour; every other tone's colour is the caller's or the Host's.
  tone?: Tone;
  numberOfLines?: number;
  // The caller's own placement and colour; the code face and danger colour win over them.
  modifiers?: TextProps['modifiers'];
}
