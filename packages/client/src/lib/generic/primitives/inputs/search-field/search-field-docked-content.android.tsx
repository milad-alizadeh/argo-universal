import {
  BasicTextField,
  type BasicTextFieldProps,
  Box,
  Row,
  Text,
  useNativeState,
} from '@expo/ui/jetpack-compose';
import {
  type ModifierConfig,
  background,
  fillMaxWidth,
  height,
  padding,
  size,
  weight,
} from '@expo/ui/jetpack-compose/modifiers';
import type * as React from 'react';
import { useCSSVariable } from 'uniwind';
import { useFollowedText } from '#primitives/native/followed-text';
import { roundedClip } from '#primitives/native/native-modifiers';
import { useComposeTextStyle } from '#primitives/native/native-typography';
import { useNativeTheme } from '../../../native-theme';
import { NativeSymbol } from '../../../symbols/native-symbol';
import type { DockedSearchQuery } from './search-field-props';

// The space after the text, as before the icon.
const inset = 16;

// Material's search bar: a 56dp pill.
const barHeight = 56;

// The icon's slot, so in the list's 16dp gutter the text starts where the header's title does (measured on Android 15): 60dp in after ☰'s 44pt slot, 72dp in after Material's back button.
const leadingSlot = { menu: 44, back: 56 } as const;

// A bare native text field drawn as Material's search bar, in the theme's selection tint, as Compose content.
export function DockedSearchFieldContent(
  props: DockedSearchQuery,
): React.JSX.Element {
  return (
    <BasicTextField
      {...useSearchValue(props)}
      {...fieldOptions}
      {...useFieldText()}
    >
      <SearchBarDecoration {...props} />
    </BasicTextField>
  );
}

// The body text in the foreground colour, the cursor in the same colour.
function useFieldText(): Pick<
  BasicTextFieldProps,
  'cursorColor' | 'textStyle'
> {
  const { foreground } = useNativeTheme().colors;

  return {
    cursorColor: foreground,
    textStyle: { ...useTypography(), color: foreground },
  };
}

function useSearchValue(
  props: DockedSearchQuery,
): Pick<BasicTextFieldProps, 'value' | 'onValueChange'> {
  return {
    value: useSearchText(props.value),
    onValueChange: props.onChangeText,
  };
}

// The field's own text, which follows the caller's value when it changes from outside, such as a cleared search.
function useSearchText(
  value: string,
): ReturnType<typeof useNativeState<string>> {
  const text = useNativeState(value);
  useFollowedText(text, value);

  return text;
}

const fieldOptions = {
  singleLine: true,
  keyboardOptions: {
    capitalization: 'none',
    autoCorrectEnabled: false,
    imeAction: 'search',
  },
  modifiers: [fillMaxWidth()],
} satisfies Partial<BasicTextFieldProps>;

// The body text style, without the alignment a Compose text field does not take.
function useTypography(): Pick<
  ReturnType<typeof useComposeTextStyle>,
  'fontFamily' | 'fontSize' | 'lineHeight' | 'fontWeight'
> {
  const { fontFamily, fontSize, lineHeight, fontWeight } =
    useComposeTextStyle('body');

  return { fontFamily, fontSize, lineHeight, fontWeight };
}

// Material's search bar: a pill in the selection tint, the icon in a slot that lines the text up with the title.
function SearchBarDecoration({
  label,
  leading,
}: DockedSearchQuery): React.JSX.Element {
  return (
    <BasicTextField.DecorationBox>
      <Row verticalAlignment="center" modifiers={usePillModifiers()}>
        <SearchIcon leading={leading} />
        <SearchBarText label={label} />
      </Row>
    </BasicTextField.DecorationBox>
  );
}

function SearchIcon({
  leading,
}: Pick<DockedSearchQuery, 'leading'>): React.JSX.Element {
  const slot = size(leadingSlot[leading], barHeight);

  return (
    <Box contentAlignment="center" modifiers={[slot]}>
      <NativeSymbol name="search" role="action" muted />
    </Box>
  );
}

function usePillModifiers(): ModifierConfig[] {
  const fill = String(useCSSVariable('--color-selected'));

  return [
    fillMaxWidth(),
    height(barHeight),
    roundedClip(barHeight / 2),
    background(fill),
  ];
}

function SearchBarText({
  label,
}: Pick<DockedSearchQuery, 'label'>): React.JSX.Element {
  return (
    <Box
      contentAlignment="centerStart"
      modifiers={[weight(1), padding(0, 0, inset, 0)]}
    >
      <BasicTextField.Placeholder>
        <SearchBarPlaceholder label={label} />
      </BasicTextField.Placeholder>
      <BasicTextField.InnerTextField />
    </Box>
  );
}

function SearchBarPlaceholder({
  label,
}: Pick<DockedSearchQuery, 'label'>): React.JSX.Element {
  const { mutedForeground } = useNativeTheme().colors;

  return (
    <Text color={mutedForeground} style={useTypography()}>
      {label}
    </Text>
  );
}

DockedSearchFieldContent satisfies React.ComponentType<DockedSearchQuery>;
