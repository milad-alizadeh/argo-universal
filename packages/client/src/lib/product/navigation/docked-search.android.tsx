import {
  BasicTextField,
  Box,
  RNHostView,
  Row,
  Text,
  useNativeState,
} from '@expo/ui/jetpack-compose';
import {
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
import { useNativeTheme } from '#lib/generic/native-theme';
import { Host } from '#lib/generic/primitives/native/host';
import { useComposeTextStyle } from '../../generic/primitives/native/native-typography';
import { Icon, iconSizeStyle } from '../../generic/symbols/icon';
import type { ScreenHeaderSearch } from './screen-header';

// The header's side inset, and a gap above the list.
const inset = 16;
const gap = 8;
// Material's search bar: a 56dp pill.
const barHeight = 56;
// ☰'s 44pt slot in the header, so the icon sits under ☰ and the text starts where the title does.
const headerItem = 44;

// A bare native text field drawn as a search bar under the header, in the theme's selection tint.
export function DockedSearch({
  search,
}: {
  search: ScreenHeaderSearch;
}): React.JSX.Element {
  const text = useNativeState('');
  const { fontFamily, fontSize, lineHeight, fontWeight } =
    useComposeTextStyle('body');
  const { foreground, mutedForeground } = useNativeTheme().colors;
  const fill = String(useCSSVariable('--color-selected'));
  return (
    <Host matchContents={{ vertical: true }} style={{ width: '100%' }}>
      <BasicTextField
        value={text}
        onValueChange={search.onChangeText}
        singleLine
        cursorColor={foreground}
        textStyle={{
          fontFamily,
          fontSize,
          lineHeight,
          fontWeight,
          color: foreground,
        }}
        keyboardOptions={{
          capitalization: 'none',
          autoCorrectEnabled: false,
          imeAction: 'search',
        }}
        modifiers={[fillMaxWidth(), padding(inset, 0, inset, gap)]}
      >
        <BasicTextField.DecorationBox>
          <Row
            verticalAlignment="center"
            modifiers={[
              fillMaxWidth(),
              height(barHeight),
              clip(Shapes.RoundedCorner(barHeight / 2)),
              background(fill),
            ]}
          >
            <Box
              contentAlignment="center"
              modifiers={[size(headerItem, barHeight)]}
            >
              <RNHostView matchContents>
                <View collapsable={false} style={iconSizeStyle('md')}>
                  <Icon name="search" className="text-muted-foreground" />
                </View>
              </RNHostView>
            </Box>
            <Box
              contentAlignment="centerStart"
              modifiers={[weight(1), padding(0, 0, inset, 0)]}
            >
              <BasicTextField.Placeholder>
                <Text
                  color={mutedForeground}
                  style={{ fontFamily, fontSize, lineHeight, fontWeight }}
                >
                  {search.placeholder}
                </Text>
              </BasicTextField.Placeholder>
              <BasicTextField.InnerTextField />
            </Box>
          </Row>
        </BasicTextField.DecorationBox>
      </BasicTextField>
    </Host>
  );
}
