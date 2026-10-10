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
import { PlatformColor } from 'react-native';
import { useIconPixels } from '../symbols/icon';
import { iconSymbols } from '../symbols/icon-names';
import { SymbolGlyph } from '../symbols/symbol-glyph';
import { nativeModifiers } from './button-ios-modifiers';
import { createNativeButton, NativeButtonIcon } from './button-native';
import type { ButtonTheme } from './button-native-colors';
import type { ButtonDataProps } from './button-props';
import { nativeButtonVariant } from './button-state';

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
  'label' | 'icon' | 'loading' | 'fullWidth' | 'role' | 'variant'
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
  props: Pick<ButtonDataProps, 'role' | 'variant'> & { contentColor?: string },
): ModifierConfig[] {
  if (props.role === 'destructive') return destructiveLabelColor(props);
  if (props.contentColor === undefined) return [];
  return [foregroundStyle(props.contentColor)];
}

function destructiveLabelColor(
  props: Pick<ButtonDataProps, 'role' | 'variant'>,
): ModifierConfig[] {
  return ['ghost', 'link'].includes(nativeButtonVariant(props))
    ? [foregroundStyle(PlatformColor('systemRed'))]
    : [];
}

function ButtonIcon(
  props: Pick<ButtonDataProps, 'loading' | 'icon' | 'role' | 'variant'> & {
    contentClass: string;
  },
): ReactElement | null {
  if (props.loading) return <ProgressView />;
  if (usesSystemRedIcon(props)) return <SystemRedIcon icon={props.icon} />;
  return <NativeButtonIcon {...props} HostView={RNHostView} />;
}

function usesSystemRedIcon(
  props: Pick<ButtonDataProps, 'role' | 'variant'>,
): boolean {
  return (
    props.role === 'destructive' && nativeButtonVariant(props) !== 'default'
  );
}

type NativeIconProps = Pick<ButtonDataProps, 'icon'>;

function SystemRedIcon({ icon }: NativeIconProps): ReactElement | null {
  const pixels = useIconPixels('md');
  if (!icon) return null;
  return (
    <RNHostView matchContents>
      <SymbolGlyph
        {...iconSymbols[icon]}
        pixels={pixels}
        tintColor={PlatformColor('systemRed')}
        testID={`icon-${icon}`}
      />
    </RNHostView>
  );
}

export type { ButtonProps } from './button-props';
