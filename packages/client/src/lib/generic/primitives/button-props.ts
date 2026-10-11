import type { ComponentProps } from 'react';
import type { Pressable } from 'react-native';
import type { IconName } from '../symbols/icon-names';

export type ButtonVariant =
  | 'default'
  | 'outline'
  | 'secondary'
  | 'ghost'
  | 'link';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonDataProps {
  label: string;
  children?: never;
  className?: never;
  style?: never;
  icon?: IconName;
  variant?: ButtonVariant;
  role?: 'destructive';
  size?: ButtonSize;
  fullWidth?: boolean;
  loading?: boolean;
  disabled?: boolean;
  onPress?: () => void;
  accessibilityLabel?: string;
  testID?: string;
}

export type SystemButtonProps = ButtonDataProps & { appearance?: 'system' };
export type ContentButtonProps = Omit<ButtonDataProps, 'className' | 'style'> &
  Pick<ComponentProps<typeof Pressable>, 'className' | 'style' | 'ref'> & {
    appearance: 'content';
    labelClassName?: string;
    labelNumberOfLines?: number;
  };
export type ButtonProps = SystemButtonProps | ContentButtonProps;
