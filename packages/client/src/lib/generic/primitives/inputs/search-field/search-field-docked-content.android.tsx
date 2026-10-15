// Split from the plain file because only Android docks a search bar at the top of a list.
import { Column, Row, TextInput, useNativeState } from '@expo/ui';
import { fillMaxWidth, weight } from '@expo/ui/jetpack-compose/modifiers';
import type * as React from 'react';
import { useCSSVariable } from 'uniwind';
import { useFollowedText } from '#primitives/native/followed-text';
import { useUniversalTextStyle } from '#primitives/native/native-typography';
import { useIconPixels } from '../../../symbols/icon-role';
import { NativeSymbol } from '../../../symbols/native-symbol';
import type { DockedSearchQuery } from './search-field-props';

// The space after the text, as before the icon.
const inset = 16;

// Material's search bar: a 56dp pill.
const barHeight = 56;

/*
 * The icon's slot, so in the list's 16dp gutter the text starts where the header's title does
 * (measured on Android 15): 60dp in after ☰'s 44pt slot, 72dp in after Material's back button.
 * It takes the icon's height too: Expo UI maps width with height to Compose's size(), but a lone
 * width to width(), whose record 57.0.22 cannot read from 44.0, and Android 15 crashed on launch.
 */
const leadingSlot = { menu: 44, back: 56 } as const;

// Material's search bar as Compose content: a pill on the selection surface token, the icon in a slot that lines the text up with the title.
export function DockedSearchFieldContent(
  props: DockedSearchQuery,
): React.JSX.Element {
  return (
    <Row alignment="center" {...usePill()}>
      <Column
        alignment="center"
        style={{
          width: leadingSlot[props.leading],
          height: useIconPixels('action'),
        }}
      >
        <NativeSymbol name="search" role="action" muted />
      </Column>
      <SearchText {...props} />
    </Row>
  );
}

function usePill(): Pick<
  React.ComponentProps<typeof Row>,
  'style' | 'modifiers'
> {
  const fill = String(useCSSVariable('--color-selected'));

  return {
    style: {
      height: barHeight,
      backgroundColor: fill,
      borderRadius: barHeight / 2,
      paddingRight: inset,
    },
    modifiers: [fillMaxWidth()],
  };
}

function SearchText(props: DockedSearchQuery): React.JSX.Element {
  return (
    <TextInput
      value={useSearchText(props.value)}
      onChangeText={props.onChangeText}
      placeholder={props.label}
      autoCapitalize="none"
      autoCorrect={false}
      returnKeyType="search"
      textStyle={useUniversalTextStyle('body')}
      modifiers={[weight(1)]}
    />
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

DockedSearchFieldContent satisfies React.ComponentType<DockedSearchQuery>;
