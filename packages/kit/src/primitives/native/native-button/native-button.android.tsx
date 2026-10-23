/*
 * The universal Button's Android tree (Compose Button, OutlinedButton or TextButton), in Material's
 * default colours, which the Host binds to Argo's tokens.
 */
import type { ButtonProps } from '@expo/ui';
import {
  Button as FilledButton,
  OutlinedButton,
  Text,
  TextButton,
} from '@expo/ui/jetpack-compose';
import { testID as testIDModifier } from '@expo/ui/jetpack-compose/modifiers';
import type { ComponentProps, ReactElement, ReactNode } from 'react';

type Variant = NonNullable<ButtonProps['variant']>;

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

  return <Stock {...stockProps(props)}>{buttonContent(props)}</Stock>;
}

function stockProps(props: ButtonProps): StockProps {
  return {
    onClick: props.disabled ? undefined : props.onPress,
    enabled: !props.disabled,
    modifiers: buttonModifiers(props),
  };
}

function buttonContent(props: ButtonProps): ReactNode {
  return props.children ?? <Text>{props.label ?? ''}</Text>;
}

// As the universal Button: the test id, then the caller's modifiers.
function buttonModifiers(props: ButtonProps): ButtonProps['modifiers'] {
  return [
    ...(props.testID ? [testIDModifier(props.testID)] : []),
    ...(props.modifiers ?? []),
  ];
}
