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
  Shapes,
  background,
  clip,
  fillMaxWidth,
  height,
  padding,
  size,
  weight,
} from '@expo/ui/jetpack-compose/modifiers';
import type * as React from 'react';
import { View } from 'react-native';
import { useCSSVariable } from 'uniwind';
import { useNativeTheme } from '../../../native-theme';
import { NativeSymbol } from '../../../symbols/native-symbol';
import { useFollowedText } from '../../fields/field-input/field-input-text';
import { Host } from '../../native/host';
import { useComposeTextStyle } from '../../native/native-typography';
import type { ListSearchBarProps } from './list-search-bar.tsx';

// The space after the text, as before the icon.
const inset = 16;
// Material's search bar: a 56dp pill.
const barHeight = 56;
// The icon's slot, so in the list's 16dp gutter the text starts where the header's title does (measured on Android 15): 60dp in after ☰'s 44pt slot, 72dp in after Material's back button.
const leadingSlot = { menu: 44, back: 56 } as const;

/*
 * A bare native text field drawn as Material's search bar at the top of a list, scrolling with it, in the theme's selection tint.
 * The class places it in the list's gutter.
 */
export function ListSearchBar({
  className,
  ...props
}: ListSearchBarProps & { className?: string }): React.JSX.Element {
  return (
    <View className={className}>
      <Host matchContents={{ vertical: true }} style={{ width: '100%' }}>
        <ListSearchField {...props} />
      </Host>
    </View>
  );
}

export function ListSearchField(props: ListSearchBarProps): React.JSX.Element {
  const textStyle = { ...useTypography(), color: useForeground() };
  return (
    <BasicTextField
      value={useSearchText(props.value)}
      onValueChange={props.onChangeText}
      {...fieldOptions}
      cursorColor={textStyle.color}
      textStyle={textStyle}
    >
      <SearchBarDecoration {...props} />
    </BasicTextField>
  );
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

const useForeground = (): string | undefined =>
  useNativeTheme().colors.foreground;

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
  placeholder,
  leading,
}: ListSearchBarProps): React.JSX.Element {
  return (
    <BasicTextField.DecorationBox>
      <Row verticalAlignment="center" modifiers={usePillModifiers()}>
        <SearchIcon leading={leading} />
        <SearchBarText placeholder={placeholder} />
      </Row>
    </BasicTextField.DecorationBox>
  );
}

function SearchIcon({
  leading,
}: Pick<ListSearchBarProps, 'leading'>): React.JSX.Element {
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
    clip(Shapes.RoundedCorner(barHeight / 2)),
    background(fill),
  ];
}

function SearchBarText({
  placeholder,
}: Pick<ListSearchBarProps, 'placeholder'>): React.JSX.Element {
  return (
    <Box
      contentAlignment="centerStart"
      modifiers={[weight(1), padding(0, 0, inset, 0)]}
    >
      <BasicTextField.Placeholder>
        <SearchBarPlaceholder placeholder={placeholder} />
      </BasicTextField.Placeholder>
      <BasicTextField.InnerTextField />
    </Box>
  );
}

function SearchBarPlaceholder({
  placeholder,
}: Pick<ListSearchBarProps, 'placeholder'>): React.JSX.Element {
  const { mutedForeground } = useNativeTheme().colors;
  return (
    <Text color={mutedForeground} style={useTypography()}>
      {placeholder}
    </Text>
  );
}
