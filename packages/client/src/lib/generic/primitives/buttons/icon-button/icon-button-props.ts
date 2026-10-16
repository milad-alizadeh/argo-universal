import type { ComponentProps, ReactNode } from 'react';
import type { Pressable } from 'react-native';
import type { ButtonSize } from '#primitives/buttons/button';
import type { IconProps } from '#primitives/display/icon';
import type { IconRole } from '../../../symbols/icon-role';
import type { IconSymbol } from '../../../symbols/icon-symbol';

type ActionProps = Omit<
  ComponentProps<typeof Pressable>,
  'children' | 'role' | 'accessibilityLabel' | 'aria-pressed'
>;

// The Button scale, one size past it; from `lg`, the button keeps one size at every width, such as a tile in a desktop rail.
export type IconButtonSize = ButtonSize | 'xl';

export type IconButtonProps = ActionProps & {
  icon: IconSymbol;
  tone?: 'danger';
  accessibilityLabel: string;
  size?: IconButtonSize;
  loading?: boolean;
  variant?: 'default' | 'ghost' | 'outline' | 'filled';
  // A button is a control; a header action or a rail tile names its own role.
  iconRole?: IconRole;
  iconClassName?: string;
  // Selects the icon's filled variant where it has one.
  iconFilled?: boolean;
  iconWeight?: IconProps['weight'];
  // A toggle: true draws it on, false draws it off; leave it out for a plain button.
  selected?: boolean;
  // Drawn over the icon, such as a header button's status dot; the caller places it.
  badge?: ReactNode;
};
