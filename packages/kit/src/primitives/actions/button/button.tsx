import {
  Button as ExpoButton,
  type ButtonProps as ExpoButtonProps,
  Row,
  Text,
} from '@expo/ui';
import { buttonDefaults } from '@repo/contracts/kit-tokens';
import type { ReactElement } from 'react';
import {
  type ColorValue,
  Platform,
  Pressable,
  View,
  type ViewStyle,
} from 'react-native';
import { useNativeTheme } from '#kit/native-theme';
import { cn } from '#kit/utils';
import { Host } from '#primitives/native/host';
import type { IconSymbol } from '../../../symbols/icon-symbol';
import { NativeIcon } from '../../../symbols/native-icon';
import type { KitProps } from '../../kit-props';
import { type LabelColor, labelColors } from './button-labels';
import { sizes, widths } from './button-layout';
import {
  disabledLooks,
  hoveredLooks,
  looks,
  pressedLooks,
} from './button-looks';

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
      {Platform.OS === 'web' ? (
        <WebButton {...props} />
      ) : (
        <ExpoButton {...expoProps(props)}>
          <ButtonLabel {...props} />
        </ExpoButton>
      )}
    </Host>
  );
}

/*
 * The web draws its own Pressable, since Expo's web Button takes one static `style` and so cannot swap the lit look
 * for a hovered or pressed one. It keeps Expo's box: 40px high (32 small), 16px padding, 8px radius.
 */
function WebButton(props: ButtonProps): ReactElement {
  const size = sizes[props.size ?? buttonDefaults.size];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={props.label}
      disabled={props.disabled ?? false}
      onPress={props.onPress}
      testID={props.testID}
      className={cn(webClass, props.fullWidth && 'w-full')}
      style={(state) => ({ ...size.style, ...webLook(props, state) })}
    >
      <View className={cn(props.disabled && 'opacity-40')}>
        <ButtonLabel {...props} />
      </View>
    </Pressable>
  );
}

const webClass =
  'h-10 shrink-0 items-center justify-center rounded-lg px-4 web:transition-all web:duration-150 web:outline-none web:focus-visible:outline-solid web:focus-visible:outline-2 web:focus-visible:outline-focus web:focus-visible:outline-offset-2';

interface WebState {
  pressed: boolean;
  hovered?: boolean;
}

// Hovered and pressed spread after the lit look; a disabled button takes neither.
function webLook(props: ButtonProps, state: WebState): ViewStyle {
  const name = variantOf(props);
  const disabled = props.disabled ?? false;

  return {
    ...looks[name],
    ...(!disabled && state.hovered ? hoveredLooks[name] : {}),
    ...(!disabled && state.pressed ? pressedLooks[name] : {}),
    ...disabledLooks[`${disabled}`][name],
  };
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
    style: size.style,
    modifiers: [...size.modifiers, ...widthOf(props).modifiers],
  };
}

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
      size={sizes[props.size ?? buttonDefaults.size].iconSize}
      color={props.color}
    />
  );
}

const labelColor = (props: ButtonProps): LabelColor =>
  labelColors[`${props.disabled ?? false}`][variantOf(props)];
