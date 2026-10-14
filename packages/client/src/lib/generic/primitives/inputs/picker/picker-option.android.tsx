import { Column, RadioButton, Row, Text } from '@expo/ui/jetpack-compose';
import {
  defaultMinSize,
  fillMaxWidth,
  padding,
  selectable,
  semantics,
  weight,
} from '@expo/ui/jetpack-compose/modifiers';
import { createElement } from 'react';
import { useComposeTextStyle } from '#primitives/native/native-typography';
import { useNativeTheme } from '../../../native-theme';
import { useRadioColors } from '../../../radio-colors';
import type { DialogProps } from './picker-dialog.android';
import type { PickerOption } from './picker-props';
import { choosePickerOption } from './picker-selection';

type OptionProps<Value extends string> = DialogProps<Value> & {
  option: PickerOption<Value>;
};

const optionHeight = 56;

const optionGap = 16;

const optionPadding = 12;

const optionInset = 24;

export function AndroidPickerOption<Value extends string>(
  props: OptionProps<Value>,
): React.JSX.Element {
  return createElement(
    Row,
    {
      verticalAlignment: 'center',
      horizontalArrangement: { spacedBy: optionGap },
      modifiers: optionModifiers(props),
    },
    <OptionMark {...props} />,
    <OptionLabel {...props} />,
  );
}

function optionModifiers<Value extends string>(
  props: OptionProps<Value>,
): ReturnType<typeof semantics>[] {
  return [
    fillMaxWidth(),
    defaultMinSize({ minHeight: optionHeight }),
    padding(optionInset, optionPadding, optionInset, optionPadding),
    semantics({
      contentDescription: [props.option.label, props.option.supporting]
        .filter(Boolean)
        .join('. '),
    }),
    ...optionSelection(props),
  ];
}

function optionSelection<Value extends string>(
  props: OptionProps<Value>,
): ReturnType<typeof selectable>[] {
  if (props.option.disabled) return [];

  return [
    selectable(
      props.option.value === props.value,
      () => commitOption(props),
      'radioButton',
    ),
  ];
}

function commitOption<Value extends string>(props: OptionProps<Value>): void {
  if (props.option.disabled) return;
  choosePickerOption(props, props.option.value);
  props.onClose();
}

function OptionMark<Value extends string>(
  props: OptionProps<Value>,
): React.JSX.Element {
  return createElement(RadioButton, useOptionMarkProps(props));
}

function useOptionMarkProps<Value extends string>(
  props: OptionProps<Value>,
): React.ComponentProps<typeof RadioButton> {
  return {
    selected: props.option.value === props.value,
    enabled: !props.option.disabled,
    onClick: props.option.disabled ? () => commitOption(props) : undefined,
    colors: useRadioColors(),
  };
}

function OptionLabel<Value extends string>(
  props: OptionProps<Value>,
): React.JSX.Element {
  const { colors } = useNativeTheme();
  const color = optionColor(props.option.disabled, colors);

  return createElement(
    Column,
    { modifiers: [weight(1)] },
    <OptionText label={props.option.label} color={color} />,
    props.option.supporting && (
      <SupportingText text={props.option.supporting} />
    ),
  );
}

function optionColor(
  disabled: boolean | undefined,
  colors: ReturnType<typeof useNativeTheme>['colors'],
): string | undefined {
  return disabled ? colors.disabledContent : colors.foreground;
}

function OptionText(props: {
  label: string;
  color?: string;
}): React.JSX.Element {
  return (
    <Text style={useComposeTextStyle('body')} color={props.color}>
      {props.label}
    </Text>
  );
}

function SupportingText(props: { text: string }): React.JSX.Element {
  const { colors } = useNativeTheme();

  return (
    <Text
      style={useComposeTextStyle('secondary')}
      color={colors.mutedForeground}
    >
      {props.text}
    </Text>
  );
}
