import {
  Button as ExpoButton,
  type ButtonProps as ExpoButtonProps,
} from '@expo/ui';
import { createModifier } from '@expo/ui/jetpack-compose/modifiers';
import { iconButtonDefaults } from '@repo/contracts/kit-tokens';
import type { ReactElement } from 'react';
import { Platform, Pressable, type ViewStyle } from 'react-native';
import { useNativeTheme } from '#kit/native-theme';
import { cn } from '#kit/utils';
import {
  buttonDisabledLooks,
  buttonHoveredLooks,
  buttonLooks,
  buttonPressedLooks,
} from '#primitives/actions/button';
import { Icon } from '#primitives/content/icon';
import { Host } from '#primitives/native/host';
import { NativeIcon } from '../../../symbols/native-icon';
import type { KitProps } from '../../kit-props';
import { sizes } from './icon-button-layout';

// What a Plugin sends for an IconButton over the wire.
export type IconButtonDataProps = KitProps<'IconButton'>;

export type IconButtonProps = IconButtonDataProps & { testID?: string };

export type IconButtonSize = NonNullable<IconButtonProps['size']>;

type Variant = NonNullable<IconButtonProps['variant']>;

/*
 * Expo UI's universal Button with the icon as its content on iOS and Android, so each platform draws its own
 * control; the web draws a Pressable in the Button's looks, since Expo's web Button has no icon-only form.
 */
export function IconButton(props: IconButtonProps): ReactElement {
  if (Platform.OS === 'web') return <WebIconButton {...props} />;

  return (
    <Host seed="primary" matchContents>
      <ExpoButton {...expoProps(props)}>
        <NativeGlyph {...props} />
      </ExpoButton>
    </Host>
  );
}

const variantOf = (props: IconButtonProps): Variant =>
  props.variant ?? iconButtonDefaults.variant;

const sizeOf = (props: IconButtonProps): (typeof sizes)[IconButtonSize] =>
  sizes[props.size ?? iconButtonDefaults.size];

const variants = {
  primary: 'filled',
  secondary: 'outlined',
  ghost: 'text',
} as const satisfies Record<Variant, ExpoButtonProps['variant']>;

// The spoken name, as Compose's semantics and SwiftUI's accessibility label.
const nameModifiers = (label: string): ExpoButtonProps['modifiers'] => [
  createModifier('accessibilityLabel', { label }),
  createModifier('semantics', { contentDescription: label }),
];

function expoProps(props: IconButtonProps): ExpoButtonProps {
  return {
    variant: variants[variantOf(props)],
    onPress: props.onPress,
    disabled: props.disabled ?? undefined,
    testID: props.testID,
    modifiers: [
      ...sizeOf(props).androidModifiers,
      ...(nameModifiers(props.accessibilityLabel) ?? []),
    ],
  };
}

const glyphColors = {
  primary: 'primaryForeground',
  secondary: 'foreground',
  ghost: 'primary',
} as const satisfies Record<Variant, string>;

function NativeGlyph(props: IconButtonProps): ReactElement {
  const { colors } = useNativeTheme();

  const color = props.disabled
    ? colors.disabledContent
    : colors[glyphColors[variantOf(props)]];

  return (
    <NativeIcon
      name={props.icon}
      role={sizeOf(props).iconRole}
      filled={props.selected ?? false}
      color={color}
    />
  );
}

function WebIconButton(props: IconButtonProps): ReactElement {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={props.accessibilityLabel}
      disabled={props.disabled ?? false}
      onPress={props.onPress}
      testID={props.testID}
      className={cn(webClass, sizeOf(props).webClass, ghostClass(props))}
      style={(state) => webLook(props, state)}
    >
      <WebGlyph {...props} />
    </Pressable>
  );
}

function WebGlyph(props: IconButtonProps): ReactElement {
  const glyph = props.disabled
    ? 'text-foreground/38'
    : webGlyphs[variantOf(props)];

  return (
    <Icon
      name={props.icon}
      role={sizeOf(props).iconRole}
      filled={props.selected ?? false}
      className={glyph}
    />
  );
}

const webClass =
  'shrink-0 items-center justify-center rounded-full web:transition-all web:duration-150 web:outline-none web:focus-visible:outline-solid web:focus-visible:outline-2 web:focus-visible:outline-focus web:focus-visible:outline-offset-2';

// Ghost has no fill, so it takes the hover and pressed tints; the lit looks carry their own.
const ghostClass = (props: IconButtonProps): string =>
  variantOf(props) === 'ghost'
    ? 'web:hover:bg-hover web:active:bg-pressed'
    : '';

const webGlyphs = {
  primary: 'text-primary-foreground',
  secondary: 'text-foreground',
  ghost: 'text-primary',
} as const satisfies Record<Variant, string>;

// The Button's lit looks for the same three, which it names primary, secondary and text.
const buttonVariants = {
  primary: 'primary',
  secondary: 'secondary',
  ghost: 'text',
} as const satisfies Record<Variant, keyof typeof buttonLooks>;

interface WebState {
  pressed: boolean;
  hovered?: boolean;
}

// Hovered and pressed spread after the lit look; a disabled button takes neither.
function webLook(props: IconButtonProps, state: WebState): ViewStyle {
  const name = buttonVariants[variantOf(props)];
  const disabled = props.disabled ?? false;

  return {
    ...buttonLooks[name],
    ...(!disabled && state.hovered ? buttonHoveredLooks[name] : {}),
    ...(!disabled && state.pressed ? buttonPressedLooks[name] : {}),
    ...buttonDisabledLooks[`${disabled}`][name],
  };
}
