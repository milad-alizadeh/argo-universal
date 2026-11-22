import { RNHostView } from '@expo/ui';
import { Button as SwiftButton, Image } from '@expo/ui/swift-ui';
import {
  accessibilityLabel,
  buttonBorderShape,
  buttonStyle,
  controlSize,
  disabled,
  dynamicTypeSize,
  labelStyle,
} from '@expo/ui/swift-ui/modifiers';
import type { IconSize } from '@repo/contracts/kit-symbols';
import type { IconButtonSize } from '@repo/contracts/kit-tokens';
import type { ComponentProps, ReactElement } from 'react';
import { Icon, IconSlot } from '#primitives/content/icon';
import { liquidGlassAvailable } from '#primitives/content/liquid-glass';
import { Host } from '#primitives/native/host';
import { nativeIconName } from '../../../symbols/native-icon-name';
import { useFixedSizeChrome } from './fixed-size-chrome';
import type { IconButtonProps } from './icon-button';
import { sizeOf, variantOf } from './icon-button-defaults';
import { iconButtonGlyph } from './icon-button-glyph';

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

// The hosted SVG glyph's size at each control size, near the SF Symbol SwiftUI draws there.
const hostedGlyphSizes = {
  sm: 'sm',
  md: 'sm',
  lg: 'md',
} as const satisfies Record<IconButtonSize, IconSize>;

const styles = liquidGlassAvailable ? glassStyles : borderedStyles;

/*
 * Expo UI's icon button: the label is the spoken name, the glyph its image, and the control size the size. A glyph
 * with no SF Symbol is the Button's own label view, and VoiceOver names the Button from the spoken name.
 */
export function IconButton(props: IconButtonProps): ReactElement {
  const fixed = useFixedSizeChrome();
  const glyph = iconButtonGlyph(props.icon, props.selected ?? false);

  return (
    <Host seed="primary" matchContents>
      {glyph.kind === 'system' ? (
        <SwiftButton
          label={props.accessibilityLabel}
          systemImage={glyph.name}
          modifiers={swiftButtonModifiers(props, fixed)}
          onPress={props.onPress}
        />
      ) : (
        <SwiftButton
          modifiers={[
            ...swiftButtonModifiers(props, fixed),
            accessibilityLabel(props.accessibilityLabel),
          ]}
          onPress={props.onPress}
        >
          {glyph.kind === 'asset' ? (
            <Image assetName={glyph.name} />
          ) : (
            <HostedGlyph {...props} />
          )}
        </SwiftButton>
      )}
    </Host>
  );
}

// The glyph's colour is the one SwiftUI gives a system image: the prominent circle's foreground, else the tint.
type HostedGlyphProps = Pick<
  IconButtonProps,
  'icon' | 'variant' | 'size' | 'disabled'
>;

const hostedGlyphClass = (props: HostedGlyphProps): string => {
  if (props.disabled) return 'text-muted-foreground';

  return variantOf(props) === 'primary'
    ? 'text-primary-foreground'
    : 'text-primary';
};

/*
 * The SVG glyph hosted from React Native. It takes no touches, so the Button around it gets the tap and presses once
 * however the circle is tapped; VoiceOver hears the Button's name.
 */
function HostedGlyph(props: HostedGlyphProps): ReactElement {
  return (
    <RNHostView matchContents>
      <IconSlot
        size={hostedGlyphSizes[sizeOf(props)]}
        pointerEvents="none"
        {...inertGlyphSlot}
      >
        <Icon name={props.icon} className={hostedGlyphClass(props)} />
      </IconSlot>
    </RNHostView>
  );
}

// The slot only draws: it is no touch target and no accessibility element of its own.
const inertGlyphSlot = {
  collapsable: false,
  accessible: false,
  accessibilityElementsHidden: true,
} as const;

// The circle's look, which the menu an icon button opens draws its label with too (IconButtonMenu).
export function swiftButtonModifiers(
  props: Pick<IconButtonProps, 'variant' | 'size' | 'disabled'>,
  fixed: boolean,
): NonNullable<SwiftProps['modifiers']> {
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
export function swiftSystemImage(
  props: Pick<IconButtonProps, 'icon' | 'selected'>,
): SwiftProps['systemImage'] {
  const name = nativeIconName(props.icon, props.selected ?? false);

  return typeof name === 'string' ? name : undefined;
}
