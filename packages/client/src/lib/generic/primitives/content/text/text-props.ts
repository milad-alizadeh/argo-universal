import type * as React from 'react';
import type { Text as RNText } from 'react-native';
import type { SizeClassValue } from '../../../use-size-class/size-class-value';
import type { Tone } from './text-tone';

export type TextRole =
  | 'title'
  | 'heading'
  | 'body'
  | 'secondary'
  | 'secondary-code'
  | 'control'
  | 'badge'
  | 'code'
  | 'nav-title'
  | 'nav-action'
  | 'row'
  | 'row-detail';

export type TextProps = Omit<
  React.ComponentProps<typeof RNText>,
  'role' | 'accessibilityRole'
> &
  React.RefAttributes<RNText> & {
    // One role, or one per size class when the text's place changes with the window.
    role?: SizeClassValue<TextRole>;
    tone?: Tone;
    // What the text is to assistive technology, such as a heading or an alert.
    accessibilityRole?: React.ComponentProps<typeof RNText>['role'];
    'aria-level'?: number;
  };
