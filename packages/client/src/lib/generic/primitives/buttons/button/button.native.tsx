import { Button as UniversalButton, RNHostView, Row, Text } from '@expo/ui';
import type { ComponentType, ReactElement } from 'react';
import { Platform } from 'react-native';
import { useNativeTheme } from '#lib/generic/native-theme';
import { Host } from '#primitives/native/host';
import { ButtonAdornment } from './button-adornment';
import { ContentButton } from './button-content';
import { withNarrowLayout } from './button-layout';
import {
  nativeButtonModifiers,
  nativeLabelModifiers,
  universalButtonVariant,
  type UniversalButtonVariant,
} from './button-native-modifiers';
import type { ButtonProps, SystemButtonProps } from './button-props';
import { isButtonDisabled, nativeButtonLayout } from './button-state';

export const Button = withNarrowLayout(function Button(
  props: ButtonProps,
): ReactElement {
  if (props.custom) return <ContentButton {...props} />;

  return <SystemButton {...props} />;
}) satisfies ComponentType<ButtonProps>;

function SystemButton(props: SystemButtonProps): ReactElement {
  return (
    <Host {...nativeButtonLayout(props)}>
      <NativeControl {...props} />
    </Host>
  );
}

function NativeControl(props: SystemButtonProps): ReactElement {
  const variant = universalButtonVariant(props);
  const dangerColor = useDangerColor(props);

  return (
    <UniversalButton
      {...props}
      variant={variant}
      disabled={isButtonDisabled(props)}
      modifiers={nativeButtonModifiers({ ...props, dangerColor })}
    >
      {buttonContent(props, variant, dangerColor)}
    </UniversalButton>
  );
}

// The owner keeps danger red, the one exception to Host-only colours; a disabled button keeps the system grey.
function useDangerColor(props: SystemButtonProps): string | undefined {
  const { colors } = useNativeTheme();
  const red = props.tone === 'danger' && !isButtonDisabled(props);

  return red ? colors.danger : undefined;
}

function buttonContent(
  props: SystemButtonProps,
  variant: UniversalButtonVariant,
  dangerColor: string | undefined,
): ReactElement | undefined {
  const color = androidLabelColor(variant, dangerColor);

  if (props.icon || props.loading) {
    const textClass = adornmentClass(variant, dangerColor);

    return <ButtonRow {...props} textClass={textClass} labelColor={color} />;
  }

  return customLabel(props, color);
}

// SwiftUI expands the label to fill a button; Compose danger needs an explicit text colour.
function customLabel(
  props: SystemButtonProps,
  color: string | undefined,
): ReactElement | undefined {
  const modifiers = nativeLabelModifiers(props);

  if (!color && modifiers.length === 0) return undefined;

  return (
    <Text modifiers={modifiers} textStyle={{ color }}>
      {props.label}
    </Text>
  );
}

// Compose takes no button colours through Expo UI, so Android reddens only the label of an unfilled button.
function androidLabelColor(
  variant: UniversalButtonVariant,
  dangerColor: string | undefined,
): string | undefined {
  return Platform.OS === 'android' && variant !== 'filled'
    ? dangerColor
    : undefined;
}

type RowProps = Pick<
  SystemButtonProps,
  'label' | 'icon' | 'loading' | 'fullWidth'
> & { textClass: string; labelColor?: string };

function ButtonRow(props: RowProps): ReactElement {
  return (
    <Row alignment="center" spacing={8} modifiers={nativeLabelModifiers(props)}>
      <HostedAdornment {...props} />
      <Text
        textStyle={props.labelColor ? { color: props.labelColor } : undefined}
      >
        {props.label}
      </Text>
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

function HostedAdornment(
  props: Pick<RowProps, 'icon' | 'loading' | 'textClass'>,
): ReactElement | null {
  if (!props.icon && !props.loading) return null;

  return (
    <RNHostView matchContents>
      <ButtonAdornment
        icon={props.icon}
        loading={props.loading}
        textClass={props.textClass}
        role="control"
      />
    </RNHostView>
  );
}

export type { ButtonProps } from './button-props';
