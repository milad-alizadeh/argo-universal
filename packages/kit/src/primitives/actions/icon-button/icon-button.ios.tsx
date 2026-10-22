import { Button as SwiftButton } from '@expo/ui/swift-ui';
import {
  // oxlint-disable-next-line anti-slop/no-shape-in-symbol-names -- SwiftUI's own modifier name.
  buttonBorderShape,
  buttonStyle,
  controlSize,
  disabled,
  font,
  labelStyle,
} from '@expo/ui/swift-ui/modifiers';
import { iconButtonDefaults } from '@repo/contracts/kit-tokens';
import type { ComponentProps, ReactElement } from 'react';
import type { SFSymbol } from 'sf-symbols-typescript';
import { Host } from '#primitives/native/host';
import { useIconPixels } from '../../../symbols/icon-role';
import { nativeIconName } from '../../../symbols/native-icon-name';
import { NativeSymbol } from '../../../symbols/native-symbol';
import type { IconButtonProps } from './icon-button';
import { sizes } from './icon-button-layout';

type SwiftProps = ComponentProps<typeof SwiftButton>;

type Variant = NonNullable<IconButtonProps['variant']>;

type Size = NonNullable<IconButtonProps['size']>;

const styles = {
  primary: 'glassProminent',
  secondary: 'glass',
  ghost: 'borderless',
} as const satisfies Record<Variant, Parameters<typeof buttonStyle>[0]>;

// Expo UI's SwiftUI Button with `labelStyle('iconOnly')`: the label stays as the spoken name and the system draws the icon alone.
export function IconButton(props: IconButtonProps): ReactElement {
  const iconPixels = useIconPixels(sizeOf(props).iconRole);

  return (
    <Host seed="primary" matchContents>
      <SwiftButton
        label={props.accessibilityLabel}
        onPress={props.onPress}
        modifiers={modifiers(props, iconPixels)}
        {...glyph(props)}
      />
    </Host>
  );
}

// The iOS 26 glass looks; the control size gives the padding round the icon.
function modifiers(
  props: IconButtonProps,
  iconPixels: number,
): SwiftProps['modifiers'] {
  return [
    buttonStyle(styles[variantOf(props)]),
    controlSize(sizeOf(props).iosControlSize),
    labelStyle('iconOnly'),
    font({ size: iconPixels }),
    // oxlint-disable-next-line anti-slop/no-shape-in-symbol-names -- SwiftUI's own modifier name.
    buttonBorderShape('circle'),
    disabled(props.disabled ?? false),
  ];
}

const variantOf = (props: IconButtonProps): Variant =>
  props.variant ?? iconButtonDefaults.variant;

const sizeOf = (props: IconButtonProps): (typeof sizes)[Size] =>
  sizes[props.size ?? iconButtonDefaults.size];

// An SF Symbol rides `systemImage`; Argo's own and Tabler icons live in the asset catalog, so they draw as the label's content.
function glyph(
  props: IconButtonProps,
): Pick<SwiftProps, 'systemImage' | 'children'> {
  const systemImage = nativeIconName(props.icon, props.selected ?? false);

  // On iOS the name is always an SF Symbol string; Expo's IconName also admits Android's drawable numbers.
  if (typeof systemImage === 'string')
    // oxlint-disable-next-line typescript/consistent-type-assertions -- SAFETY: on iOS nativeIconName returns an SF Symbol name.
    return { systemImage: systemImage as SFSymbol };

  return {
    children: (
      <NativeSymbol
        name={props.icon}
        role={sizeOf(props).iconRole}
        filled={props.selected ?? false}
      />
    ),
  };
}
