import type { buttonSizes, buttonVariants } from '@repo/contracts/kit-tokens';
import type { KitProps } from '../../kit-props';

export type ButtonVariant = (typeof buttonVariants)[number];

export type ButtonSize = (typeof buttonSizes)[number];

// Kit-only: test identity.
export type ButtonProps = KitProps<'Button'> & { testID?: string };

// The system button on phones; Argo draws it on the web.
export type { ButtonProps as ButtonDataProps };

// The button Argo draws. `className` is for the kit only, such as ButtonGroup joining a split's corners; Button never takes it.
export type DrawnButtonProps = ButtonProps & { className?: string };
