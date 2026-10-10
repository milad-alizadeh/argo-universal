import {
  Button as SwiftButton,
  HStack,
  ProgressView,
  RNHostView,
  Text,
} from '@expo/ui/swift-ui';
import {
  frame,
  foregroundStyle,
  type ModifierConfig,
} from '@expo/ui/swift-ui/modifiers';
import type { ComponentProps, ReactElement } from 'react';
import { nativeModifiers } from './button-ios-modifiers';
import { createNativeButton, NativeButtonIcon } from './button-native';
import type { ButtonTheme } from './button-native-colors';
import type { ButtonDataProps } from './button-props';

export const Button = createNativeButton(NativeControl);

function NativeControl(
  props: ButtonDataProps & { theme: ButtonTheme },
): ReactElement {
  return (
    <SwiftButton {...nativeControlProps(props)}>
      <ButtonLabel
        {...props}
        contentClass={props.theme.contentClass}
        contentColor={props.theme.colors.contentColor}
      />
    </SwiftButton>
  );
}

type NativeControlProps = Pick<
  ButtonDataProps,
  | 'role'
  | 'variant'
  | 'size'
  | 'disabled'
  | 'loading'
  | 'label'
  | 'accessibilityLabel'
  | 'onPress'
  | 'testID'
> & { theme: Pick<ButtonTheme, 'primary'> };

function nativeControlProps(
  props: NativeControlProps,
): Omit<ComponentProps<typeof SwiftButton>, 'children'> {
  return {
    role: props.role,
    onPress: props.onPress,
    testID: props.testID,
    modifiers: nativeModifiers(props, props.theme.primary),
  };
}

type ButtonLabelProps = Pick<
  ButtonDataProps,
  'label' | 'icon' | 'loading' | 'fullWidth' | 'role'
> & { contentClass: string; contentColor?: string };

function ButtonLabel(props: ButtonLabelProps): ReactElement {
  return (
    <HStack
      spacing={8}
      modifiers={props.fullWidth ? [frame({ maxWidth: Infinity })] : []}
    >
      <ButtonIcon {...props} />
      <Text modifiers={buttonLabelColor(props)}>{props.label}</Text>
    </HStack>
  );
}

function buttonLabelColor(
  props: Pick<ButtonDataProps, 'role'> & { contentColor?: string },
): ModifierConfig[] {
  if (props.role === 'destructive' || props.contentColor === undefined)
    return [];
  return [foregroundStyle(props.contentColor)];
}

function ButtonIcon(
  props: Pick<ButtonDataProps, 'loading' | 'icon'> & { contentClass: string },
): ReactElement | null {
  if (props.loading) return <ProgressView />;
  return <NativeButtonIcon {...props} HostView={RNHostView} />;
}

export type { ButtonProps } from './button-props';
