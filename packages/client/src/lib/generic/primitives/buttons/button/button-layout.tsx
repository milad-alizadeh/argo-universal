import type { ComponentType, ReactElement } from 'react';
import { useWide } from '../../../use-wide/use-wide';
import type { ButtonProps, ButtonSize, ButtonVariant } from './button-props';

const narrowSizes: Record<ButtonSize, ButtonSize> = {
  xs: 'md',
  sm: 'md',
  md: 'md',
  lg: 'lg',
};

const narrowVariants: Record<ButtonVariant, ButtonVariant> = {
  default: 'default',
  outline: 'outline',
  secondary: 'secondary',
  ghost: 'outline',
  link: 'outline',
};

// A narrow window gives the button the full width at the phone's height, with an edge that shows its bounds.
function narrowLayout(props: ButtonProps): ButtonProps {
  return {
    ...props,
    fullWidth: true,
    size: narrowSizes[props.size ?? 'md'],
    variant: props.variant && narrowVariants[props.variant],
  };
}

function useWidthLayout(props: ButtonProps): ButtonProps {
  if (useWide()) return { ...props, fullWidth: props.fullWidth === true };

  return phoneLayout(props);
}

// A phone has no small buttons; fullWidth "narrow" also fills the width.
function phoneLayout(props: ButtonProps): ButtonProps {
  if (props.fullWidth === 'narrow') return narrowLayout(props);

  return { ...props, size: narrowSizes[props.size ?? 'md'] };
}

type Drawing = ComponentType<ButtonProps>;

/*
 * Resolves the button's layout by the window's width, so pages never choose a phone button themselves:
 * a phone has no small buttons, and fullWidth "narrow" fills a narrow window.
 */
export function withNarrowLayout(Drawing: Drawing): Drawing {
  return function Button(props: ButtonProps): ReactElement {
    return <Drawing {...useWidthLayout(props)} />;
  };
}
