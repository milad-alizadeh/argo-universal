import type { ComponentProps, ReactNode } from 'react';
import type { Pressable } from 'react-native';
import type { IconProps } from '#primitives/content/icon';
import type { IconRole } from '../../../symbols/icon-role';
import type { KitProps } from '../../kit-props';

type ActionProps = Omit<
  ComponentProps<typeof Pressable>,
  'children' | 'role' | 'accessibilityLabel' | 'aria-pressed'
>;

// The Button scale, one size past it; from `lg`, the button keeps one size at every width, such as a tile in a desktop rail.
export type IconButtonSize = NonNullable<KitProps<'IconButton'>['size']>;

// Kit-only: native pressable attributes, icon drawing, badge content and glyph alignment.
export type IconButtonProps = KitProps<'IconButton'> &
  Omit<ActionProps, keyof KitProps<'IconButton'>> & {
    iconRole?: IconRole;
    iconClassName?: string;
    iconFilled?: boolean;
    iconWeight?: IconProps['weight'];
    // A secondary glyph, such as a link beside a muted version label.
    iconTone?: 'muted';
    /*
     * The button lays out as its control glyph alone and its hit area bleeds past it on every side,
     * so the glyph lines up with text, gaps and padding: a row's trailing action, inline links.
     */
    bleed?: boolean;
    badge?: ReactNode;
  };
