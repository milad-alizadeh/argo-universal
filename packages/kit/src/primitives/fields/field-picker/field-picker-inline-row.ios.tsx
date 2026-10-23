import { Button, HStack, Spacer, VStack } from '@expo/ui/swift-ui';
import {
  accessibilityAddTraits,
  buttonStyle,
  disabled,
  font,
  foregroundStyle,
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
  props: Pick<FieldPickerProps, 'disabled'>,
): ReturnType<typeof disabled>[] => [disabled(props.disabled ?? false)];

// A subtitle as a stock row draws it: the secondary shade, one text style down.
const subtitleModifiers = [
  font({ textStyle: 'subheadline' }),
  foregroundStyle({ type: 'hierarchical', style: 'secondary' }),
];

// An option's title (and icon) and its subtitle under it.
function OptionLabel(props: { option: FieldPickerOption }): ReactElement {
  return (
    <>
      <RowTitle title={props.option.label} leading={props.option.icon} />
      {props.option.subtitle ? (
        <NativeText modifiers={subtitleModifiers}>
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

/*
 * One option as a row of its own, a `multiple` inline choice's and a page's: the option and, once chosen, a check at
 * its end, the whole row taking the press.
 */
export function OptionRow(props: OptionRowProps): ReactElement {
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
