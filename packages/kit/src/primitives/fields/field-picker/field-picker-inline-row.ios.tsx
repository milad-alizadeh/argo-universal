import { Button, HStack, ProgressView, Spacer } from '@expo/ui/swift-ui';
import {
  accessibilityAddTraits,
  buttonStyle,
  disabled,
} from '@expo/ui/swift-ui/modifiers';
import type { ReactElement } from 'react';
import { NativeSymbol } from '../../../symbols/native-symbol';
import {
  isOptionOff,
  optionChoice,
  type OptionRowProps,
} from './field-picker-kind';
import type { FieldPickerOption } from './field-picker-model';
import { OptionTitle } from './field-picker-option-title';
import { wholeRowPress } from './field-picker-screen-row.ios';

const selectedTrait = accessibilityAddTraits(['isSelected']);

const pressModifiers = (
  props: OptionRowProps,
  selected: boolean,
): ReturnType<typeof disabled>[] => [
  buttonStyle('plain'),
  disabled(isOptionOff(props)),
  ...(selected ? [selectedTrait] : []),
];

// A choice being applied shows a spinner where its check will be.
function mark(
  option: FieldPickerOption,
  selected: boolean,
): ReactElement | null {
  if (option.pending) return <ProgressView />;

  return selected ? <NativeSymbol name="check" /> : null;
}

/*
 * One option as a row of its own, a `multiple` inline choice's and a page's: the option and, once chosen, a check at
 * its end, the whole row taking the press.
 */
export function OptionRow(props: OptionRowProps): ReactElement {
  const { selected, toggle } = optionChoice(props);

  return (
    <Button onPress={toggle} modifiers={pressModifiers(props, selected)}>
      <HStack modifiers={[wholeRowPress]}>
        <OptionTitle option={props.option} />
        <Spacer />
        {mark(props.option, selected)}
      </HStack>
    </Button>
  );
}
