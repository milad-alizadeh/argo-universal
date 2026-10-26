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
import { NativeText, useTextColor } from '#primitives/content/native-text';
import { RowTitle } from '#primitives/fields/field-row';
import { NativeSymbol } from '../../../symbols/native-symbol';
import {
  isOptionOff,
  optionChoice,
  type OptionRowProps,
} from './field-picker-kind';
import type { FieldPickerOption } from './field-picker-model';
import { wholeRowPress } from './field-picker-screen-row.ios';

// A subtitle as a stock row draws it: the secondary shade, one text style down, or the warning colour it asks for.
const subtitleModifiers = (
  warning: string | undefined,
): ReturnType<typeof font>[] => [
  font({ textStyle: 'subheadline' }),
  foregroundStyle(warning ?? { type: 'hierarchical', style: 'secondary' }),
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
      <Subtitle text={option.subtitle} tone={option.subtitleTone} />
    </>
  );
}

function Subtitle(props: {
  text?: string;
  tone?: 'warning';
}): ReactElement | null {
  const warning = useTextColor(props.tone);

  if (!props.text) return null;

  return (
    <NativeText modifiers={subtitleModifiers(warning)}>{props.text}</NativeText>
  );
}

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
        <VStack alignment="leading">
          <OptionLabel option={props.option} />
        </VStack>
        <Spacer />
        {mark(props.option, selected)}
      </HStack>
    </Button>
  );
}
