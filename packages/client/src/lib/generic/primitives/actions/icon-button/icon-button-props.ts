import type { ComponentProps, ReactNode } from 'react';
import type { Pressable } from 'react-native';
import type { ButtonSize } from '#primitives/actions/button';
import type { IconProps } from '#primitives/content/icon';
import type { IconRole } from '../../../symbols/icon-role';
import type { KitProps } from '../../kit-props';

type ActionProps = Omit<
  ComponentProps<typeof Pressable>,
  'children' | 'role' | 'accessibilityLabel' | 'aria-pressed'
>;

// The Button scale, one size past it; from `lg`, the button keeps one size at every width, such as a tile in a desktop rail.
export type IconButtonSize = ButtonSize | 'xl';

// Kit-only: native pressable attributes, icon drawing and badge content.
export type IconButtonProps = KitProps<'IconButton'> &
  Omit<ActionProps, keyof KitProps<'IconButton'>> & {
    iconRole?: IconRole;
    iconClassName?: string;
    iconFilled?: boolean;
    iconWeight?: IconProps['weight'];
    badge?: ReactNode;
  };
