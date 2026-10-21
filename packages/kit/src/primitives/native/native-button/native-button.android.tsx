/*
 * The universal Button's Android tree (Compose Button, OutlinedButton or TextButton), with Argo's
 * colours through each one's `colors` (ButtonColors); the universal Button takes none, and the Host's
 * tonal palette turns its primary teal.
 */
import type { ButtonProps } from '@expo/ui';
import {
  type ButtonColors,
  Button as FilledButton,
  OutlinedButton,
  Text,
  TextButton,
} from '@expo/ui/jetpack-compose';
import { testID as testIDModifier } from '@expo/ui/jetpack-compose/modifiers';
import type { ComponentProps, ReactElement, ReactNode } from 'react';
import { useMaterialPalette } from '#primitives/native/material-palette';

type Variant = NonNullable<ButtonProps['variant']>;

type Palette = ReturnType<typeof useMaterialPalette>;

type StockProps = Omit<ComponentProps<typeof FilledButton>, 'children'>;

const stockButtons = {
  filled: FilledButton,
  outlined: OutlinedButton,
  text: TextButton,
} as const satisfies Record<
  Variant,
  (props: ComponentProps<typeof FilledButton>) => ReactNode
>;

export function NativeButton(props: ButtonProps): ReactElement {
  const variant = props.variant ?? 'filled';
  const Stock = stockButtons[variant];

  return (
    <Stock {...stockProps(props, variantColors(useMaterialPalette(), variant))}>
      {buttonContent(props)}
    </Stock>
  );
}

function stockProps(props: ButtonProps, colors: ButtonColors): StockProps {
  return {
    colors,
    onClick: props.disabled ? undefined : props.onPress,
    enabled: !props.disabled,
    modifiers: buttonModifiers(props),
  };
}

function buttonContent(props: ButtonProps): ReactNode {
  return props.children ?? <Text>{props.label ?? ''}</Text>;
}

function variantColors(palette: Palette, variant: Variant): ButtonColors {
  return variant === 'filled'
    ? palette.filledButtonColors
    : palette.bareButtonColors;
}

// As the universal Button: the test id, then the caller's modifiers.
function buttonModifiers(props: ButtonProps): ButtonProps['modifiers'] {
  return [
    ...(props.testID ? [testIDModifier(props.testID)] : []),
    ...(props.modifiers ?? []),
  ];
}
