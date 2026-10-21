import { textRoles } from '@repo/contracts/kit-tokens';
import type * as React from 'react';
import type { Text as RNText } from 'react-native';
import type { KitProps } from '../../kit-props';

export { textRoles };

export type TextRole = (typeof textRoles)[number];

export type TextProps = Omit<
  React.ComponentProps<typeof RNText>,
  keyof KitProps<'Text'> | 'accessibilityRole'
> &
  React.RefAttributes<RNText> &
  KitProps<'Text'> & {
    // De-emphasized supporting text, using the tertiary token.
    dimmed?: boolean;
    // What the text is to assistive technology, such as a heading or an alert.
    accessibilityRole?: React.ComponentProps<typeof RNText>['role'];
    'aria-level'?: number;
  };
