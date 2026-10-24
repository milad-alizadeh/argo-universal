import {
  Button as ExpoButton,
  type ButtonProps as ExpoButtonProps,
} from '@expo/ui';
import { createModifier } from '@expo/ui/jetpack-compose/modifiers';
import type { ComponentProps, ReactElement } from 'react';
import { Platform, type Pressable } from 'react-native';
import { useNativeTheme } from '#kit/native-theme';
import { Host } from '#primitives/native/host';
import { NativeIcon } from '../../../symbols/native-icon';
import type { KitProps } from '../../kit-props';
import { sizeOf, variantOf } from './icon-button-layout';
import { WebIconButton } from './icon-button-web';

// What a Plugin sends for an IconButton over the wire.
export type IconButtonDataProps = KitProps<'IconButton'>;

/*
 * `muted` is for the app's own screens, not the wire: a ghost glyph in the secondary tone, as an Icon's muted tone.
 * The rest of a Pressable's props pass through on the web, since a Radix trigger clones its child with handlers and aria state.
 */
export type IconButtonProps = IconButtonDataProps & {
  testID?: string;
  muted?: boolean;
} & Omit<
    ComponentProps<typeof Pressable>,
    keyof IconButtonDataProps | 'children' | 'style' | 'className' | 'ref'
  >;

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
      size={sizeOf(props).androidIconSize}
      filled={props.selected ?? false}
      color={color}
    />
  );
}
