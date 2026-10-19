import type { ReactNode } from 'react';
import type { KitProps } from '../../kit-props';

// Kit-only: hosted content, decorative presentation, status backdrop and test identity.
export type AvatarProps = KitProps<'Avatar'> & {
  children?: ReactNode;
  decorative?: boolean;
  statusSurface?: 'card' | 'muted' | 'selected';
  testID?: string;
};
