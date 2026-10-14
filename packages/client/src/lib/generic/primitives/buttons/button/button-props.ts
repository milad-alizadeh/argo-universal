import type { ComponentProps, ReactElement } from 'react';
import type { Pressable } from 'react-native';
import type { IconName } from '../../../symbols/icon-names';

export type ButtonVariant =
  | 'default'
  | 'outline'
  | 'secondary'
  | 'ghost'
  | 'link';

// `xs` is the compact toolbar button of a desktop header.
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg';

export interface ButtonDataProps {
  label: string;
  children?: never;
  className?: never;
  style?: never;
  icon?: IconName;
  variant?: ButtonVariant;
  role?: 'destructive';
  size?: ButtonSize;
  // "narrow" fills a narrow window and stays compact on a wide one.
  fullWidth?: boolean | 'narrow';
  loading?: boolean;
  disabled?: boolean;
  onPress?: () => void;
  accessibilityLabel?: string;
  testID?: string;
}

export type SystemButtonProps = ButtonDataProps & { appearance?: 'system' };

export type ContentButtonProps = Omit<ButtonDataProps, 'className' | 'style'> &
  Pick<
    ComponentProps<typeof Pressable>,
    'className' | 'style' | 'ref' | 'onHoverIn' | 'onHoverOut'
  > & {
    appearance: 'content';
    labelClassName?: string;
    labelNumberOfLines?: number;
    leading?: ReactElement;
    trailing?: ReactElement;
    id?: string;
    'aria-haspopup'?: 'dialog';
    'aria-expanded'?: boolean;
    'aria-controls'?: string;
  };

export type ButtonProps = SystemButtonProps | ContentButtonProps;
