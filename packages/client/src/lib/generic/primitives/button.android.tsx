import {
  Button as ComposeButton,
  CircularProgressIndicator,
  FilledTonalButton,
  OutlinedButton,
  RNHostView,
  Row,
  Text,
  TextButton,
} from '@expo/ui/jetpack-compose';
import {
  fillMaxWidth,
  semantics,
  size,
  testID,
  type ModifierConfig,
} from '@expo/ui/jetpack-compose/modifiers';
import type { ComponentProps, ReactElement } from 'react';
import { useIconPixels } from '../symbols/icon';
import { createNativeButton, NativeButtonIcon } from './button-native';
import type { ButtonTheme } from './button-native-colors';
import type { ButtonDataProps, ButtonVariant } from './button-props';
import { isButtonDisabled, nativeButtonVariant } from './button-state';

const nativeButtons = {
  default: ComposeButton,
  outline: OutlinedButton,
  secondary: FilledTonalButton,
  ghost: TextButton,
  link: TextButton,
} satisfies Record<ButtonVariant, typeof ComposeButton>;

export const Button = createNativeButton(NativeControl);

function NativeControl(
  props: ButtonDataProps & { theme: ButtonTheme },
): ReactElement {
  const NativeButton = nativeButtons[nativeButtonVariant(props)];
  return (
    <NativeButton {...nativeControlProps(props)}>
      <ButtonLabel
        {...props}
        contentClass={props.theme.contentClass}
        color={props.theme.colors.disabledContentColor}
      />
    </NativeButton>
  );
}

type NativeControlProps = Pick<
  ButtonDataProps,
  | 'onPress'
  | 'disabled'
  | 'loading'
  | 'label'
  | 'accessibilityLabel'
  | 'fullWidth'
  | 'testID'
> & { theme: Pick<ButtonTheme, 'colors'> };

function nativeControlProps(
  props: NativeControlProps,
): Omit<ComponentProps<typeof ComposeButton>, 'children'> {
  return {
    onClick: props.onPress,
    enabled: !isButtonDisabled(props),
    colors: props.theme.colors,
    modifiers: nativeModifiers(props),
  };
}

type AccessibleButtonProps = Pick<
  ButtonDataProps,
  'label' | 'accessibilityLabel' | 'fullWidth' | 'testID' | 'loading'
>;

function nativeModifiers(props: AccessibleButtonProps): ModifierConfig[] {
  return [
    semantics({ contentDescription: buttonDescription(props) }),
    ...(props.fullWidth ? [fillMaxWidth()] : []),
    ...buttonIdentifier(props.testID),
  ];
}

function buttonDescription(props: AccessibleButtonProps): string {
  const label = props.accessibilityLabel ?? props.label;
  return props.loading ? `${label}, Loading` : label;
}

function buttonIdentifier(identifier?: string): ModifierConfig[] {
  return identifier ? [testID(identifier)] : [];
}

function ButtonLabel(
  props: Pick<ButtonDataProps, 'label' | 'loading' | 'icon'> & {
    contentClass: string;
    color: string | undefined;
  },
): ReactElement {
  return (
    <Row horizontalArrangement={{ spacedBy: 8 }} verticalAlignment="center">
      <ButtonIcon {...props} />
      <Text style={{ typography: 'labelLarge' }}>{props.label}</Text>
    </Row>
  );
}

type ButtonIconProps = Pick<ButtonDataProps, 'loading' | 'icon'> & {
  contentClass: string;
  color: string | undefined;
};

function ButtonIcon(props: ButtonIconProps): ReactElement | null {
  if (props.loading) return <LoadingIcon color={props.color} />;
  return <NativeButtonIcon {...props} HostView={RNHostView} />;
}

function LoadingIcon(props: { color?: string }): ReactElement {
  const pixels = useIconPixels('md');
  return (
    <CircularProgressIndicator
      color={props.color}
      trackColor="transparent"
      modifiers={[size(pixels, pixels)]}
    />
  );
}

export type { ButtonProps } from './button-props';
