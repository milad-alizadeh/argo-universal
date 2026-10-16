import type { ComponentType, ReactElement } from 'react';
import { useInCentredOverlay } from '#primitives/overlays/centred-overlay';
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
function narrowLayout<Props extends ButtonProps>(props: Props): Props {
  return {
    ...props,
    fullWidth: true,
    size: narrowSizes[props.size ?? 'md'],
    variant: props.variant && narrowVariants[props.variant],
  };
}

// A centred dialog or sheet keeps the wide layout on a medium window too.
function useWidthLayout<Props extends ButtonProps>(props: Props): Props {
  const wide = useWide();
  const centred = useInCentredOverlay();

  if (wide || centred) return { ...props, fullWidth: props.fullWidth === true };

  return phoneLayout(props);
}

// A phone has no small buttons; fullWidth "narrow" also fills the width.
function phoneLayout<Props extends ButtonProps>(props: Props): Props {
  if (props.fullWidth === 'narrow') return narrowLayout(props);

  return { ...props, size: narrowSizes[props.size ?? 'md'] };
}

/*
 * Resolves the button's layout by the window's width, so pages never choose a phone button themselves:
 * a phone has no small buttons, and fullWidth "narrow" fills a narrow window.
 */
export function withNarrowLayout<Props extends ButtonProps>(
  Drawing: ComponentType<Props>,
): ComponentType<Props> {
  return function Button(props: Props): ReactElement {
    return <Drawing {...useWidthLayout(props)} />;
  };
}
