import { Button, Group, HStack, Spacer, Text } from '@expo/ui/swift-ui';
import {
  accessibilityAddTraits,
  accessibilityElement,
  accessibilityHint,
  accessibilityLabel,
  accessibilityValue,
  buttonStyle,
  contentShape,
  disabled,
  foregroundStyle,
  frame,
  padding,
  shapes,
} from '@expo/ui/swift-ui/modifiers';
import { createElement } from 'react';
import { useNativeTheme } from '#lib/generic/native-theme';
import { NativeSymbol } from '../../../symbols/native-symbol';
import { useSwiftUITextModifiers } from '../../native/native-typography';
import { createNativeCheckbox } from './checkbox-native';
import type { CheckboxProps } from './checkbox-props';
import type { CheckboxState } from './checkbox-state';

export type { CheckboxProps } from './checkbox-props';

const rowHeight = 48;
const horizontalInset = 16;
const verticalInset = 8;
const rowModifiers = [
  frame({ minHeight: rowHeight, maxWidth: Infinity }),
  padding({ horizontal: horizontalInset, vertical: verticalInset }),
  contentShape(shapes.rectangle()),
];

export const Checkbox = createNativeCheckbox(CheckboxButton);

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
    accessibilityAddTraits(['isToggle']),
    accessibilityHint(props.state.description ?? ''),
  ];
}

function CheckboxRow(props: CheckboxProps): React.JSX.Element {
  const textModifiers = useSwiftUITextModifiers('body', 'row');
  return (
    <HStack modifiers={rowModifiers}>
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
