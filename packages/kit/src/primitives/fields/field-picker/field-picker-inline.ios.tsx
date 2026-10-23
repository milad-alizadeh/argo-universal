import { Button, HStack, Picker, Spacer, VStack } from '@expo/ui/swift-ui';
import {
  accessibilityAddTraits,
  buttonStyle,
  disabled,
  pickerStyle,
  tag,
} from '@expo/ui/swift-ui/modifiers';
import type { ReactElement } from 'react';
import { NativeText } from '#primitives/content/native-text';
import { RowTitle } from '#primitives/fields/field-row';
import { NativeSymbol } from '../../../symbols/native-symbol';
import {
  optionChoice,
  type OptionRowProps,
} from './field-picker-inline-choice';
import type { FieldPickerOption, FieldPickerProps } from './field-picker-model';
import { wholeRowPress } from './field-picker-page-row.ios';

const offModifiers = (
  props: FieldPickerProps,
): ReturnType<typeof disabled>[] => [disabled(props.disabled ?? false)];

/*
 * An `inline` choice of one value: SwiftUI's inline Picker, whose options Form lays out as rows of its Section, the
 * chosen one marked with a check. An option is tagged with its value.
 */
export function InlinePicker(props: FieldPickerProps): ReactElement {
  return (
    <Picker
      label={props.title}
      selection={optionSelection(props)}
      onSelectionChange={(value: string) => props.onValueChange(value)}
      modifiers={[pickerStyle('inline'), ...offModifiers(props)]}
    >
      {props.options.map(tagged)}
    </Picker>
  );
}

const optionSelection = (props: FieldPickerProps): string =>
  typeof props.value === 'string' ? props.value : (props.value[0] ?? '');

const tagged = (option: FieldPickerOption): ReactElement => (
  <VStack
    key={option.value}
    alignment="leading"
    modifiers={[tag(option.value)]}
  >
    <OptionLabel option={option} />
  </VStack>
);

// A Picker holds one tag, so a `multiple` choice is a row per option that toggles its own value.
export function InlineChecks(props: FieldPickerProps): ReactElement {
  return (
    <>
      {props.options.map((option) => (
        <CheckRow key={option.value} {...props} option={option} />
      ))}
    </>
  );
}

function OptionLabel(props: { option: FieldPickerOption }): ReactElement {
  return (
    <>
      <RowTitle title={props.option.label} leading={props.option.icon} />
      {props.option.subtitle ? (
        <NativeText role="secondary" tone="muted">
          {props.option.subtitle}
        </NativeText>
      ) : null}
    </>
  );
}

const selectedTrait = accessibilityAddTraits(['isSelected']);

const pressModifiers = (
  props: OptionRowProps,
  selected: boolean,
): ReturnType<typeof disabled>[] => [
  buttonStyle('plain'),
  ...offModifiers(props),
  ...(selected ? [selectedTrait] : []),
];

// A row of the option and, once chosen, a check at its end, the whole row taking the press.
function CheckRow(props: OptionRowProps): ReactElement {
  const { selected, toggle } = optionChoice(props);

  return (
    <Button onPress={toggle} modifiers={pressModifiers(props, selected)}>
      <HStack modifiers={[wholeRowPress]}>
        <VStack alignment="leading">
          <OptionLabel option={props.option} />
        </VStack>
        <Spacer />
        {selected ? <NativeSymbol name="check" size="sm" /> : null}
      </HStack>
    </Button>
  );
}
