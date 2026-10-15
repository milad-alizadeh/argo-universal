import {
  Button as UniversalButton,
  RNHostView,
  Row,
  Text,
  type TextProps,
} from '@expo/ui';
import type { ComponentProps, ComponentType, ReactElement } from 'react';
import { Platform } from 'react-native';
import { useNativeTheme } from '#lib/generic/native-theme';
import { Host } from '#primitives/native/host';
import { useUniversalTextStyle } from '#primitives/native/native-typography';
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
    !!props.icon ||
    !!props.loading ||
    androidLabelColor(variant, dangerColor) !== undefined
  );
}

// The owner keeps danger red, the one exception to Host-only colours; a disabled button keeps the system grey.
function useDangerColor(props: SystemButtonProps): string | undefined {
  const { colors } = useNativeTheme();
  const red = props.tone === 'danger' && !isButtonDisabled(props);

  return red ? colors.danger : undefined;
}

function rowColors(
  variant: UniversalButtonVariant,
  dangerColor: string | undefined,
): Pick<RowProps, 'textClass' | 'labelColor'> {
  return {
    textClass: adornmentClass(variant, dangerColor),
    labelColor: androidLabelColor(variant, dangerColor),
  };
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
      <ButtonLabel label={props.label} color={props.labelColor} />
    </Row>
  );
}

// Compose's universal Text drops the button's labelLarge style, so Android takes Argo's control role; iOS sizes it by controlSize.
function ButtonLabel(props: { label: string; color?: string }): ReactElement {
  const textStyle = useUniversalTextStyle('control');

  const style: TextProps['textStyle'] =
    Platform.OS === 'android'
      ? { ...textStyle, color: props.color }
      : undefined;

  return <Text textStyle={style}>{props.label}</Text>;
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
