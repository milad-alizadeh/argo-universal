import type { ReactNode } from 'react';
import type { Tone } from '#primitives/content/text';
import type { KitProps } from '../../kit-props';

/*
 * Kit-only: hosted content, decorative presentation, status backdrop (or none) and test identity; a list row's medium size; and a
 * tone that tints the circle and its hosted glyph, such as a Subagent's role.
 */
export type AvatarProps = Omit<KitProps<'Avatar'>, 'size'> & {
  size?: KitProps<'Avatar'>['size'] | 'md';
  children?: ReactNode;
  decorative?: boolean;
  statusSurface?: 'card' | 'muted' | 'selected' | 'none';
  testID?: string;
  tone?: Tone;
};
