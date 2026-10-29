import type { ComponentProps, ReactElement } from 'react';
import type { Pressable } from 'react-native';
import type { KitProps } from '../../kit-props';

// Kit-only: native view attributes, without free content or styling.
export type PillProps = Omit<KitProps<'Pill'>, 'onPress'> &
  Omit<
    ComponentProps<typeof Pressable>,
    keyof KitProps<'Pill'> | 'children' | 'style' | 'className' | 'hitSlop'
  > & {
    onPress?: ComponentProps<typeof Pressable>['onPress'];
    leading?: ReactElement;
    trailing?: ReactElement;
  };
