import { Picker, Text } from '@expo/ui/swift-ui';
import {
  accessibilityLabel,
  disabled,
  pickerStyle,
  tag,
  tint,
} from '@expo/ui/swift-ui/modifiers';
import type * as React from 'react';
import { useNativeTheme } from '#lib/generic/native-theme';
import { Host } from './host';
import type { SelectMenuProps } from './select-menu';

const unchosen = '';

export function SelectMenu<Value extends string>(
  props: SelectMenuProps<Value>,
): React.JSX.Element {
  const modifiers = usePickerModifiers(props);
  const selection = pickerSelection(props);
  return (
    <Host matchContents>
      <Picker {...selection} modifiers={modifiers}>
        <PickerChoices {...props} />
      </Picker>
    </Host>
  );
}

function chooseOption<Value extends string>(
  next: string,
  props: Pick<SelectMenuProps<Value>, 'options' | 'onValueChange'>,
): void {
  const option = props.options.find((item) => item.value === next);
  if (option) props.onValueChange(option.value);
}

function usePickerModifiers(
  props: Pick<
    SelectMenuProps<string>,
    'accessibilityLabel' | 'disabled' | 'invalid'
  >,
): React.ComponentProps<typeof Picker>['modifiers'] {
  const colors = useNativeTheme().colors;
  const valueColor = props.invalid ? colors.destructive : colors.tint;
  return [
    pickerStyle('menu'),
    accessibilityLabel(props.accessibilityLabel),
    disabled(props.disabled),
    ...(valueColor === undefined ? [] : [tint(valueColor)]),
  ];
}

function pickerSelection<Value extends string>(
  props: Pick<SelectMenuProps<Value>, 'value' | 'options' | 'onValueChange'>,
): Pick<
  React.ComponentProps<typeof Picker>,
  'selection' | 'onSelectionChange'
> {
  return {
    selection:
      props.options.find((option) => option.value === props.value)?.value ??
      unchosen,
    onSelectionChange: (next): void => {
      if (typeof next === 'string') chooseOption(next, props);
    },
  };
}

function PickerChoices<Value extends string>(
  props: Pick<SelectMenuProps<Value>, 'value' | 'options' | 'placeholder'>,
): React.JSX.Element {
  const chosen = props.options.some((option) => option.value === props.value);
  return (
    <>
      {!chosen && <PickerPlaceholder text={props.placeholder ?? 'Choose…'} />}
      {props.options.map((option) => (
        <Text key={option.value} modifiers={[tag(option.value)]}>
          {option.label}
        </Text>
      ))}
    </>
  );
}

function PickerPlaceholder({ text }: { text: string }): React.JSX.Element {
  return <Text modifiers={[tag(unchosen)]}>{text}</Text>;
}
