import { Button, Group, HStack, Spacer, Text } from '@expo/ui/swift-ui';
import {
  accessibilityAddTraits,
  accessibilityElement,
  accessibilityHint,
  accessibilityLabel,
  accessibilityValue,
  buttonStyle,
  disabled,
  foregroundStyle,
  frame,
  padding,
} from '@expo/ui/swift-ui/modifiers';
import { type ComponentType, createElement } from 'react';
import { useNativeTheme } from '#lib/generic/native-theme';
import { Host } from '#primitives/native/host';
import { rectangularHitArea } from '#primitives/native/native-modifiers';
import { useSwiftUITextModifiers } from '#primitives/native/native-typography';
import { NativeSymbol } from '../../../symbols/native-symbol';
import { createNativeCheckbox } from './checkbox-native';
import type { CheckboxProps, CheckboxIndicatorProps } from './checkbox-props';
import type { CheckboxState } from './checkbox-state';

export type { CheckboxProps } from './checkbox-props';

const rowHeight = 48;

const optionHeight = 32;

const optionInset = 12;

const horizontalInset = 16;

const verticalInset = 8;

function rowModifiers(props: CheckboxProps): ReturnType<typeof frame>[] {
  return [
    frame({
      minHeight: props.variant === 'option' ? optionHeight : rowHeight,
      maxWidth: Infinity,
    }),
    padding({
      horizontal: props.variant === 'option' ? optionInset : horizontalInset,
      vertical: verticalInset,
    }),
    rectangularHitArea(),
  ];
}

export const Checkbox = createNativeCheckbox(
  CheckboxButton,
) satisfies ComponentType<CheckboxProps>;

type ButtonProps = CheckboxProps & { state: CheckboxState };

function CheckboxButton(props: ButtonProps): React.JSX.Element {
  return createElement(
    Button,
    { onPress: props.state.toggle, modifiers: buttonModifiers(props) },
    <CheckboxRow {...props} />,
  );
}

function buttonModifiers(props: ButtonProps): ReturnType<typeof buttonStyle>[] {
  return [
    buttonStyle('plain'),
    disabled(!!props.disabled),
    accessibilityElement('ignore'),
    accessibilityLabel(props.label),
    accessibilityValue(props.value ? 'Checked' : 'Unchecked'),
    selectionTraits(props),
    accessibilityHint(props.state.description ?? ''),
  ];
}

function CheckboxRow(props: CheckboxProps): React.JSX.Element {
  const textModifiers = useOptionTextModifiers(props);

  return (
    <HStack modifiers={rowModifiers(props)}>
      <Text modifiers={textModifiers}>{props.label}</Text>
      <Spacer />
      {props.value && <CheckboxMark />}
    </HStack>
  );
}

function CheckboxMark(): React.JSX.Element {
  const { colors } = useNativeTheme();

  return (
    <Group modifiers={[foregroundStyle(colors.tint ?? 'primary')]}>
      <NativeSymbol name="check" role="mark" />
    </Group>
  );
}

function useOptionTextModifiers(
  props: CheckboxProps,
): ReturnType<typeof frame>[] {
  return useSwiftUITextModifiers(
    props.variant === 'option' ? 'nav-action' : 'body',
    'row',
  );
}

function selectionTraits(
  props: CheckboxProps,
): ReturnType<typeof accessibilityAddTraits> {
  if (props.selection !== 'single') return accessibilityAddTraits(['isToggle']);

  return accessibilityAddTraits(
    props.value ? ['isButton', 'isSelected'] : ['isButton'],
  );
}

export function CheckboxIndicator(
  props: CheckboxIndicatorProps,
): React.JSX.Element | null {
  if (!props.value) return null;

  return (
    <Host matchContents>
      <CheckboxMark />
    </Host>
  );
}

CheckboxIndicator satisfies ComponentType<CheckboxIndicatorProps>;
