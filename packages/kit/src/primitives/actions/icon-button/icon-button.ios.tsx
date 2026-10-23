import { Button as SwiftButton } from '@expo/ui/swift-ui';
import {
  // oxlint-disable-next-line anti-slop/no-shape-in-symbol-names -- SwiftUI's own modifier name.
  buttonBorderShape,
  buttonStyle,
  controlSize,
  disabled,
  labelStyle,
} from '@expo/ui/swift-ui/modifiers';
import { iconButtonDefaults } from '@repo/contracts/kit-tokens';
import type { ComponentProps, ReactElement } from 'react';
import { liquidGlassAvailable } from '#primitives/content/liquid-glass';
import { Host } from '#primitives/native/host';
import { nativeIconName } from '../../../symbols/native-icon-name';
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

// Expo UI's icon button: the label is the spoken name, the system image the glyph, and the control size the size.
export function IconButton(props: IconButtonProps): ReactElement {
  return (
    <Host seed="primary" matchContents>
      <SwiftButton
        label={props.accessibilityLabel}
        systemImage={systemImage(props)}
        modifiers={modifiers(props)}
        onPress={props.onPress}
      />
    </Host>
  );
}

function modifiers(props: IconButtonProps): SwiftProps['modifiers'] {
  return [
    buttonStyle(styles[variantOf(props)]),
    controlSize(sizeOf(props).iosControlSize),
    labelStyle('iconOnly'),
    // oxlint-disable-next-line anti-slop/no-shape-in-symbol-names -- SwiftUI's own modifier name.
    buttonBorderShape('circle'),
    disabled(props.disabled ?? false),
  ];
}

// Expo UI's shared icon name also allows an Android drawable; on iOS it is always an SF Symbol name.
function systemImage(props: IconButtonProps): SwiftProps['systemImage'] {
  const name = nativeIconName(props.icon, props.selected ?? false);

  return typeof name === 'string' ? name : undefined;
}

const variantOf = (props: IconButtonProps): Variant =>
  props.variant ?? iconButtonDefaults.variant;

const sizeOf = (props: IconButtonProps): (typeof sizes)[Size] =>
  sizes[props.size ?? iconButtonDefaults.size];
