import type { ComponentProps } from 'react';
import type { Pressable } from 'react-native';
import type { IconSize } from '../symbols/icon';
import type { IconName } from '../symbols/icon-names';
import type { ButtonSize } from './button-props';

type ActionProps = Omit<
  ComponentProps<typeof Pressable>,
  'children' | 'role' | 'accessibilityLabel'
>;

// Past `lg`, the button keeps one size at every width, such as a tile in a desktop rail.
export type IconButtonSize = ButtonSize | 'xl' | '2xl';

export type IconButtonProps = ActionProps & {
  icon: IconName;
  accessibilityLabel: string;
  size?: IconButtonSize;
  loading?: boolean;
  variant?: 'default' | 'ghost' | 'outline' | 'filled';
  iconSize?: IconSize;
  iconClassName?: string;
  filled?: boolean;
};
