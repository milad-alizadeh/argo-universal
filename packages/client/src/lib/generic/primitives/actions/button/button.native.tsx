import { RNHostView, Row } from '@expo/ui';
import type { ComponentProps, ReactElement } from 'react';
import { Platform } from 'react-native';
import { NativeText, useDangerColor } from '#primitives/content/native-text';
import { Host } from '#primitives/native/host';
import { NativeButton } from '#primitives/native/native-button';
import { ButtonAdornment } from './button-adornment';
import { ContentButton } from './button-content';
import { withNarrowLayout } from './button-layout';
import {
  nativeButtonModifiers,
  nativeLabelModifiers,
  universalButtonVariant,
  type UniversalButtonVariant,
} from './button-native-modifiers';
import type { ButtonProps } from './button-props';
import { isButtonDisabled, nativeButtonLayout } from './button-state';

// Kit only, as on the web; phones draw their SplitButton natively and never reach it.
export const DrawnButton = withNarrowLayout(ContentButton);

export const Button = withNarrowLayout(function Button(
  props: ButtonProps,
): ReactElement {
  return (
    <Host {...nativeButtonLayout(props)}>
      <NativeControl {...props} />
    </Host>
  );
});

function NativeControl(props: ButtonProps): ReactElement {
  const variant = universalButtonVariant(props);

  // A disabled danger button keeps the system grey.
  const dangerColor = useDangerColor(
    isButtonDisabled(props) ? undefined : props.tone,
  );

  const common = nativeControlProps(props, variant, dangerColor);

  // A text-only button hands its label to Expo, which draws it; decoration, an Android danger label or an iOS full width needs a row.
  if (!needsRow(props, variant, dangerColor))
    return <NativeButton {...common} label={props.label} />;

  return (
    <NativeButton {...common}>
      <ButtonRow {...props} {...rowColors(variant, dangerColor)} />
    </NativeButton>
  );
}

function nativeControlProps(
  props: ButtonProps,
  variant: UniversalButtonVariant,
  dangerColor: string | undefined,
): Omit<ComponentProps<typeof NativeButton>, 'children' | 'label'> {
  return {
    variant,
    onPress: props.onPress,
    disabled: isButtonDisabled(props),
    testID: props.testID,
    modifiers: nativeButtonModifiers({ ...props, dangerColor }),
  };
}

function needsRow(
  props: ButtonProps,
  variant: UniversalButtonVariant,
  dangerColor: string | undefined,
): boolean {
  return (
    decorated(props) ||
    androidDangerLabel(variant, dangerColor) ||
    iosFullWidth(props)
  );
}

const decorated = (props: Pick<ButtonProps, 'icon' | 'loading'>): boolean =>
  !!props.icon || !!props.loading;

// SwiftUI sizes a button to its label, so a full-width one draws its label in a row that fills the width.
const iosFullWidth = (props: Pick<ButtonProps, 'fullWidth'>): boolean =>
  Platform.OS === 'ios' && props.fullWidth === true;

function rowColors(
  variant: UniversalButtonVariant,
  dangerColor: string | undefined,
): Pick<RowProps, 'textClass' | 'spinnerClass' | 'dangerLabel'> {
  return {
    textClass: adornmentClass(variant, dangerColor),
    spinnerClass: adornmentSpinnerClass(variant, dangerColor),
    dangerLabel: androidDangerLabel(variant, dangerColor),
  };
}

// The kit's Android button colours carry no tone, so Android reddens only the label of an unfilled button.
function androidDangerLabel(
  variant: UniversalButtonVariant,
  dangerColor: string | undefined,
): boolean {
  return Platform.OS === 'android' && variant !== 'filled' && !!dangerColor;
}

type RowProps = Pick<
  ButtonProps,
  'label' | 'icon' | 'loading' | 'fullWidth'
> & { textClass: string; spinnerClass: string; dangerLabel: boolean };

function ButtonRow(props: RowProps): ReactElement {
  return (
    <Row alignment="center" spacing={8} modifiers={nativeLabelModifiers(props)}>
      <HostedAdornment {...props} />
      <NativeText
        role="control"
        tone={props.dangerLabel ? 'danger' : undefined}
      >
        {props.label}
      </NativeText>
    </Row>
  );
}

// Hosted React Native views cannot read the native label colour, so the icon takes the matching token.
const adornmentClasses = {
  filled: 'text-primary-foreground',
  outlined: 'text-primary',
  text: 'text-primary',
} as const satisfies Record<UniversalButtonVariant, string>;

function adornmentClass(
  variant: UniversalButtonVariant,
  dangerColor: string | undefined,
): string {
  return dangerColor && variant !== 'filled'
    ? 'text-danger'
    : adornmentClasses[variant];
}

const adornmentSpinnerClasses = {
  filled: 'accent-primary-foreground',
  outlined: 'accent-primary',
  text: 'accent-primary',
} as const satisfies Record<UniversalButtonVariant, string>;

function adornmentSpinnerClass(
  variant: UniversalButtonVariant,
  dangerColor: string | undefined,
): string {
  return dangerColor && variant !== 'filled'
    ? 'accent-danger'
    : adornmentSpinnerClasses[variant];
}

function HostedAdornment(
  props: Pick<RowProps, 'icon' | 'loading' | 'textClass' | 'spinnerClass'>,
): ReactElement | null {
  if (!props.icon && !props.loading) return null;

  return (
    <RNHostView matchContents>
      <ButtonAdornment {...props} role="control" />
    </RNHostView>
  );
}

export type { ButtonProps } from './button-props';
