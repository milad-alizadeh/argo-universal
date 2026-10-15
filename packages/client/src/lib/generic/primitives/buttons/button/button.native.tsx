import { Button as UniversalButton, RNHostView, Row } from '@expo/ui';
import type { ComponentProps, ComponentType, ReactElement } from 'react';
import { Platform } from 'react-native';
import { NativeText, useDangerColor } from '#primitives/display/native-text';
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

  // A disabled danger button keeps the system grey.
  const dangerColor = useDangerColor(
    isButtonDisabled(props) ? undefined : props.tone,
  );

  const common = nativeControlProps(props, variant, dangerColor);

  // A text-only button hands its label to Expo, which draws it; only decoration or an Android danger label needs a row.
  if (!needsRow(props, variant, dangerColor))
    return <UniversalButton {...common} label={props.label} />;

  return (
    <UniversalButton {...common}>
      <ButtonRow {...props} {...rowColors(variant, dangerColor)} />
    </UniversalButton>
  );
}

function nativeControlProps(
  props: SystemButtonProps,
  variant: UniversalButtonVariant,
  dangerColor: string | undefined,
): Omit<ComponentProps<typeof UniversalButton>, 'children' | 'label'> {
  return {
    variant,
    onPress: props.onPress,
    disabled: isButtonDisabled(props),
    testID: props.testID,
    modifiers: nativeButtonModifiers({ ...props, dangerColor }),
  };
}

function needsRow(
  props: SystemButtonProps,
  variant: UniversalButtonVariant,
  dangerColor: string | undefined,
): boolean {
  return (
    !!props.icon || !!props.loading || androidDangerLabel(variant, dangerColor)
  );
}

function rowColors(
  variant: UniversalButtonVariant,
  dangerColor: string | undefined,
): Pick<RowProps, 'textClass' | 'dangerLabel'> {
  return {
    textClass: adornmentClass(variant, dangerColor),
    dangerLabel: androidDangerLabel(variant, dangerColor),
  };
}

// Compose takes no button colours through Expo UI, so Android reddens only the label of an unfilled button.
function androidDangerLabel(
  variant: UniversalButtonVariant,
  dangerColor: string | undefined,
): boolean {
  return Platform.OS === 'android' && variant !== 'filled' && !!dangerColor;
}

type RowProps = Pick<
  SystemButtonProps,
  'label' | 'icon' | 'loading' | 'fullWidth'
> & { textClass: string; dangerLabel: boolean };

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
