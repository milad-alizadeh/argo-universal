import type { ComponentProps, ReactNode } from 'react';
import type { Pressable } from 'react-native';
import type { IconProps } from '#primitives/display/icon/icon';
import type { IconName } from '../../../symbols/icon-names';
import type { IconRole } from '../../../symbols/icon-role';
import type { ButtonSize } from '../button/button-props';

type ActionProps = Omit<
  ComponentProps<typeof Pressable>,
  'children' | 'role' | 'accessibilityLabel'
>;

// Past `lg`, the button keeps one size at every width, such as a tile in a desktop rail.
export type IconButtonSize = Exclude<ButtonSize, 'xs'> | 'xl' | '2xl';

export type IconButtonProps = ActionProps & {
  icon: IconName;
  accessibilityLabel: string;
  size?: IconButtonSize;
  loading?: boolean;
  variant?: 'default' | 'ghost' | 'outline' | 'filled';
  // A button is a control; a header action or a rail tile names its own role.
  iconRole?: IconRole;
  iconClassName?: string;
  filled?: boolean;
  iconWeight?: IconProps['weight'];
  // A toggle: true draws it on, false draws it off; leave it out for a plain button.
  'aria-pressed'?: boolean;
  // Drawn over the icon, such as a header button's status dot; the caller places it.
  badge?: ReactNode;
};
