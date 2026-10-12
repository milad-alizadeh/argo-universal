import type { ComponentType, ReactElement } from 'react';
import { useWide } from '../use-wide';
import type { ButtonProps, ButtonSize, ButtonVariant } from './button-props';

const narrowSizes: Record<ButtonSize, ButtonSize> = {
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
  const wide = useWide();
  return wide ? { ...props, fullWidth: false } : narrowLayout(props);
}

type Drawing = ComponentType<ButtonProps>;

function NarrowAwareButton({
  Drawing,
  ...props
}: ButtonProps & { Drawing: Drawing }): ReactElement {
  return <Drawing {...useWidthLayout(props)} />;
}

// Resolves fullWidth "narrow" by the window's width, so pages never choose a phone button themselves.
export function withNarrowLayout(Drawing: Drawing): Drawing {
  return function Button(props: ButtonProps): ReactElement {
    if (props.fullWidth === 'narrow')
      return <NarrowAwareButton Drawing={Drawing} {...props} />;
    return <Drawing {...props} />;
  };
}
