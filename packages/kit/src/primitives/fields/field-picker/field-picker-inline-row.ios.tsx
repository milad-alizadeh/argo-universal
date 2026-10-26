import {
  Button,
  HStack,
  ProgressView,
  Spacer,
  VStack,
} from '@expo/ui/swift-ui';
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
import { optionChoice, type OptionRowProps } from './field-picker-kind';
import type { FieldPickerOption, FieldPickerProps } from './field-picker-model';
import { wholeRowPress } from './field-picker-screen-row.ios';

const offModifiers = (
  props: Pick<FieldPickerProps, 'disabled'>,
  option?: FieldPickerOption,
): ReturnType<typeof disabled>[] => [
  disabled(Boolean(props.disabled || option?.disabled)),
];

// A subtitle as a stock row draws it: the secondary shade, one text style down.
const subtitleModifiers = [
  font({ textStyle: 'subheadline' }),
  foregroundStyle({ type: 'hierarchical', style: 'secondary' }),
];

// An option's title (and icon) and its subtitle under it.
function OptionLabel(props: { option: FieldPickerOption }): ReactElement {
  const { option } = props;

  return (
    <>
      <RowTitle
        title={option.label}
        leading={option.icon}
        logo={option.logo}
        tone={option.tone}
      />
      <Subtitle text={option.subtitle} />
    </>
  );
}

function Subtitle(props: { text?: string }): ReactElement | null {
  if (!props.text) return null;

  return <NativeText modifiers={subtitleModifiers}>{props.text}</NativeText>;
}

const selectedTrait = accessibilityAddTraits(['isSelected']);

const pressModifiers = (
  props: OptionRowProps,
  selected: boolean,
): ReturnType<typeof disabled>[] => [
  buttonStyle('plain'),
  ...offModifiers(props, props.option),
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
        <VStack alignment="leading">
          <OptionLabel option={props.option} />
        </VStack>
        <Spacer />
        {mark(props.option, selected)}
      </HStack>
    </Button>
  );
}
