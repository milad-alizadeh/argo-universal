import type { ReactNode } from 'react';
import type { ImageSourcePropType } from 'react-native';
import type { StatusDotProps } from '#primitives/status/status-dot';

export interface AvatarProps {
  initials: string;
  size?: 'sm' | 'lg';
  source?: ImageSourcePropType;
  children?: ReactNode;
  accessibilityLabel: string;
  decorative?: boolean;
  statusSurface?: 'card' | 'muted' | 'selected';
  testID?: string;
  status?: Pick<StatusDotProps, 'tone' | 'pulse' | 'accessibilityLabel'>;
}
