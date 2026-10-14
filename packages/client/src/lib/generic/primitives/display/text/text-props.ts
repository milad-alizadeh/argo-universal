import type * as React from 'react';
import type { Text as RNText } from 'react-native';

export type TextRole =
  | 'title'
  | 'heading'
  | 'body'
  | 'secondary'
  | 'control'
  | 'badge'
  | 'code'
  | 'nav-title'
  | 'nav-action';

export type TextProps = Omit<React.ComponentProps<typeof RNText>, 'role'> &
  React.RefAttributes<RNText> & {
    role?: TextRole;
    semanticRole?: React.ComponentProps<typeof RNText>['role'];
    'aria-level'?: number;
    asChild?: boolean;
  };
