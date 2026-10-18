import type { buttonSizes, buttonVariants } from '@repo/contracts/kit-tokens';
import type { IconName } from '../../../symbols/icon-names';

export type ButtonVariant = (typeof buttonVariants)[number];

export type ButtonSize = (typeof buttonSizes)[number];

export interface ButtonDataProps {
  label: string;
  icon?: IconName;
  variant?: ButtonVariant;
  // The danger tone draws the button in red.
  tone?: 'danger';
  size?: ButtonSize;
  // "narrow" fills a narrow window and stays compact on a wide one.
  fullWidth?: boolean | 'narrow';
  loading?: boolean;
  disabled?: boolean;
  onPress?: () => void;
  accessibilityLabel?: string;
  testID?: string;
}

// The system button on phones; Argo draws it on the web.
export type ButtonProps = ButtonDataProps;

// The button Argo draws. `className` is for the kit only, such as ButtonGroup joining a split's corners; Button never takes it.
export type DrawnButtonProps = ButtonProps & { className?: string };
