import type * as React from 'react';
import type { Text as RNText } from 'react-native';
import type { Tone } from './text-tone';

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

export type TextProps = Omit<
  React.ComponentProps<typeof RNText>,
  'role' | 'accessibilityRole'
> &
  React.RefAttributes<RNText> & {
    role?: TextRole;
    tone?: Tone;
    // What the text is to assistive technology, such as a heading or an alert.
    accessibilityRole?: React.ComponentProps<typeof RNText>['role'];
    'aria-level'?: number;
    asChild?: boolean;
  };
