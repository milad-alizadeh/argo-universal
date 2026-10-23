import { Button as SwiftButton } from '@expo/ui/swift-ui';
import {
  accessibilityLabel,
  // oxlint-disable-next-line anti-slop/no-shape-in-symbol-names -- SwiftUI's own modifier name.
  buttonBorderShape,
  buttonStyle,
  controlSize,
  disabled,
} from '@expo/ui/swift-ui/modifiers';
import { iconButtonDefaults } from '@repo/contracts/kit-tokens';
import type { ComponentProps, ReactElement } from 'react';
import { liquidGlassAvailable } from '#primitives/content/liquid-glass';
import { Host } from '#primitives/native/host';
import { NativeSymbol } from '../../../symbols/native-symbol';
import type { IconButtonProps } from './icon-button';
import { sizes } from './icon-button-layout';

type SwiftProps = ComponentProps<typeof SwiftButton>;

type Variant = NonNullable<IconButtonProps['variant']>;

type Size = NonNullable<IconButtonProps['size']>;

const glassStyles = {
  primary: 'glassProminent',
  secondary: 'glass',
  ghost: 'borderless',
} as const satisfies Record<Variant, Parameters<typeof buttonStyle>[0]>;

// Before iOS 26 the glass styles draw nothing, so a button takes the bordered looks that have a filled or tinted circle.
const borderedStyles = {
  primary: 'borderedProminent',
  secondary: 'bordered',
  ghost: 'borderless',
} as const satisfies Record<Variant, Parameters<typeof buttonStyle>[0]>;

const styles = liquidGlassAvailable ? glassStyles : borderedStyles;

// Expo UI's SwiftUI Button with `labelStyle('iconOnly')`: the label stays as the spoken name and the system draws the icon alone.
export function IconButton(props: IconButtonProps): ReactElement {
  return (
    <Host seed="primary" matchContents>
      <SwiftButton
        onPress={props.onPress}
        modifiers={modifiers(props)}
        {...glyph(props)}
      />
    </Host>
  );
}

// The iOS 26 glass looks; the control size gives the padding round the icon.
function modifiers(props: IconButtonProps): SwiftProps['modifiers'] {
  return [
    buttonStyle(styles[variantOf(props)]),
    controlSize(sizeOf(props).iosControlSize),
    accessibilityLabel(props.accessibilityLabel),
    // oxlint-disable-next-line anti-slop/no-shape-in-symbol-names -- SwiftUI's own modifier name.
    buttonBorderShape('circle'),
    disabled(props.disabled ?? false),
  ];
}

const variantOf = (props: IconButtonProps): Variant =>
  props.variant ?? iconButtonDefaults.variant;

const sizeOf = (props: IconButtonProps): (typeof sizes)[Size] =>
  sizes[props.size ?? iconButtonDefaults.size];

// The glyph draws through NativeSymbol, as every Icon does, so a button's icon is the size and tone of an Icon. Content replaces the label text, so the spoken name rides an accessibility label.
function glyph(props: IconButtonProps): Pick<SwiftProps, 'children'> {
  return {
    children: (
      <NativeSymbol
        name={props.icon}
        size={sizeOf(props).iconSize}
        filled={props.selected ?? false}
        muted={props.muted}
      />
    ),
  };
}
