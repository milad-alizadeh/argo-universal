import {
  Button,
  type ButtonDataProps,
  type ButtonProps,
} from '@repo/kit/primitives/actions/button';
import { useWide } from '@repo/kit/use-wide/use-wide';
import type { ReactElement } from 'react';

type WireVariant = NonNullable<ButtonDataProps['variant']>;

type WireSize = NonNullable<ButtonDataProps['size']>;

const variants = {
  default: 'primary',
  outline: 'secondary',
  secondary: 'secondary',
  ghost: 'text',
  link: 'text',
} as const satisfies Record<WireVariant, ButtonProps['variant']>;

const sizes = {
  xs: 'sm',
  sm: 'sm',
  md: 'md',
  lg: 'md',
} as const satisfies Record<WireSize, ButtonProps['size']>;

// A Plugin sends the wire's Button props; the kit Button takes its own.
export function PluginButton(props: ButtonDataProps): ReactElement {
  const wide = useWide();

  return (
    <Button
      label={props.label}
      onPress={props.onPress}
      variant={variantOf(props)}
      size={sizes[props.size ?? 'md']}
      icon={props.icon}
      fullWidth={fills(props.fullWidth, wide)}
      disabled={props.disabled === true || props.loading === true}
    />
  );
}

function variantOf(props: ButtonDataProps): ButtonProps['variant'] {
  if (props.tone === 'danger') return 'danger';

  return variants[props.variant ?? 'default'];
}

// Full width always, or "narrow" only on a compact window.
function fills(
  fullWidth: ButtonDataProps['fullWidth'],
  wide: boolean,
): boolean {
  return fullWidth === true || (fullWidth === 'narrow' && !wide);
}
