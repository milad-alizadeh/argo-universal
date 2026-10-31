import { Button as SwiftButton } from '@expo/ui/swift-ui';
import {
  buttonBorderShape,
  buttonStyle,
  controlSize,
  disabled,
  dynamicTypeSize,
  labelStyle,
} from '@expo/ui/swift-ui/modifiers';
import type { IconButtonSize } from '@repo/contracts/kit-tokens';
import type { ComponentProps, ReactElement } from 'react';
import { liquidGlassAvailable } from '#primitives/content/liquid-glass';
import { Host } from '#primitives/native/host';
import { nativeIconName } from '../../../symbols/native-icon-name';
import { useFixedSizeChrome } from './fixed-size-chrome';
import type { IconButtonProps } from './icon-button';
import { sizeOf, variantOf } from './icon-button-defaults';

type SwiftProps = ComponentProps<typeof SwiftButton>;

type Variant = NonNullable<IconButtonProps['variant']>;

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

/*
 * SwiftUI draws mini as small and extra large as large, so each size is one of the platform's own steps: small,
 * regular and large.
 */
const controlSizes = {
  sm: 'small',
  md: 'regular',
  lg: 'large',
} as const satisfies Record<IconButtonSize, Parameters<typeof controlSize>[0]>;

const styles = liquidGlassAvailable ? glassStyles : borderedStyles;

// Expo UI's icon button: the label is the spoken name, the system image the glyph, and the control size the size.
export function IconButton(props: IconButtonProps): ReactElement {
  const fixed = useFixedSizeChrome();

  return (
    <Host seed="primary" matchContents>
      <SwiftButton
        label={props.accessibilityLabel}
        systemImage={systemImage(props)}
        modifiers={modifiers(props, fixed)}
        onPress={props.onPress}
      />
    </Host>
  );
}

function modifiers(
  props: IconButtonProps,
  fixed: boolean,
): SwiftProps['modifiers'] {
  return [
    buttonStyle(styles[variantOf(props)]),
    controlSize(controlSizes[sizeOf(props)]),
    labelStyle('iconOnly'),
    buttonBorderShape('circle'),
    disabled(props.disabled ?? false),
    ...(fixed ? [dynamicTypeSize('large')] : []),
  ];
}

// Expo UI's shared icon name also allows an Android drawable; on iOS it is always an SF Symbol name.
function systemImage(props: IconButtonProps): SwiftProps['systemImage'] {
  const name = nativeIconName(props.icon, props.selected ?? false);

  return typeof name === 'string' ? name : undefined;
}
