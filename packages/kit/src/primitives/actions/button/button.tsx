import {
  Button as ExpoButton,
  type ButtonProps as ExpoButtonProps,
  Row,
  Text,
} from '@expo/ui';
import { buttonDefaults } from '@repo/contracts/kit-tokens';
import type { ReactElement } from 'react';
import { type ColorValue, Platform } from 'react-native';
import { useNativeTheme } from '#kit/native-theme';
import { Host } from '#primitives/native/host';
import type { IconSymbol } from '../../../symbols/icon-symbol';
import { NativeIcon } from '../../../symbols/native-icon';
import type { KitProps } from '../../kit-props';
import { type LabelColor, labelColors } from './button-labels';
import { sizes, widths } from './button-layout';
import { disabledLooks, looks } from './button-looks';

// What a Plugin sends for a Button over the wire.
export type ButtonDataProps = KitProps<'Button'>;

export interface ButtonProps {
  label: string;
  onPress?: () => void;
  // Expo UI's filled, outlined and text looks; danger is the text look. Defaults to primary.
  variant?: 'primary' | 'secondary' | 'text' | 'danger';
  // Defaults to md.
  size?: 'sm' | 'md';
  // An Argo icon before the label.
  icon?: IconSymbol;
  fullWidth?: boolean;
  disabled?: boolean;
  testID?: string;
}

export type ButtonSize = NonNullable<ButtonProps['size']>;

type Variant = NonNullable<ButtonProps['variant']>;

// Expo UI's universal Button. Each platform reads its own modifiers and ignores the other's.
export function Button(props: ButtonProps): ReactElement {
  return (
    <Host seed="primary" {...widthOf(props).host}>
      <ExpoButton {...expoProps(props)}>
        <ButtonLabel {...props} />
      </ExpoButton>
    </Host>
  );
}

const variantOf = (props: ButtonProps): Variant => props.variant ?? 'primary';

function expoProps(props: ButtonProps): ExpoButtonProps {
  const size = sizes[props.size ?? buttonDefaults.size];

  return {
    variant: variants[variantOf(props)],
    label: props.label,
    onPress: props.onPress,
    disabled: props.disabled,
    testID: props.testID,
    style: { ...size.style, ...looksOf(props) },
    modifiers: [...size.modifiers, ...widthOf(props).modifiers],
  };
}

// The lit looks are CSS strings (`var(--color-muted)`) only the web reads; Android's transformStyle would hand them to Color.parseColor and crash.
const looksOf = (props: ButtonProps): (typeof looks)[Variant] =>
  Platform.OS === 'web'
    ? {
        ...looks[variantOf(props)],
        ...disabledLooks[`${props.disabled ?? false}`][variantOf(props)],
      }
    : {};

const variants = {
  primary: 'filled',
  secondary: 'outlined',
  text: 'text',
  danger: 'text',
} as const satisfies Record<Variant, ExpoButtonProps['variant']>;

const widthOf = (props: ButtonProps): (typeof widths)[keyof typeof widths] =>
  widths[`${props.fullWidth ?? false}`];

/*
 * Expo UI's documented custom content: its Icon before its Text, the Text in the variant's colour, since the web's
 * Text draws in the foreground colour and Expo has no danger look.
 */
function ButtonLabel(props: ButtonProps): ReactElement {
  const color = useNativeTheme().colors[labelColor(props)];
  const width = widthOf(props);

  return (
    <Row spacing={6} alignment="center" modifiers={[...width.label]}>
      {width.edge}
      {props.icon && <LeadingIcon {...props} icon={props.icon} color={color} />}
      <Text textStyle={{ color }}>{props.label}</Text>
      {width.edge}
    </Row>
  );
}

function LeadingIcon(
  props: ButtonProps & { icon: IconSymbol; color: ColorValue | undefined },
): ReactElement | null {
  return (
    <NativeIcon
      name={props.icon}
      role={sizes[props.size ?? buttonDefaults.size].iconRole}
      color={props.color}
    />
  );
}

const labelColor = (props: ButtonProps): LabelColor =>
  labelColors[`${props.disabled ?? false}`][variantOf(props)];
