import type { ComponentProps } from 'react';
import type { Pressable } from 'react-native';
import type { IconSize } from '../symbols/icon';
import type { IconName } from '../symbols/icon-names';
import type { ButtonSize } from './button-props';

type ActionProps = Omit<
  ComponentProps<typeof Pressable>,
  'children' | 'role' | 'accessibilityLabel'
>;

export type IconButtonProps = ActionProps & {
  icon: IconName;
  accessibilityLabel: string;
  size?: ButtonSize;
  loading?: boolean;
  variant?: 'default' | 'ghost' | 'outline' | 'filled';
  iconSize?: IconSize;
  iconClassName?: string;
  filled?: boolean;
};
