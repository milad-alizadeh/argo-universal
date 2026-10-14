import { Box, Row } from '@expo/ui/jetpack-compose';
import {
  type ModifierConfig,
  background,
  clickable,
  fillMaxWidth,
  height,
  semantics,
  size,
  weight,
} from '@expo/ui/jetpack-compose/modifiers';
import type * as React from 'react';
import { useCSSVariable } from 'uniwind';
import { roundedClip } from '#primitives/native/native-modifiers';
import { NativeSymbol } from '../../../symbols/native-symbol';
import {
  type HeaderSearch,
  useHeaderSearch,
} from './search-field-header-search.android';
import {
  OpenSearchBarContent,
  SearchLabel,
} from './search-field-open-bar.android';
import type { DockedSearchQuery } from './search-field-props';

// Material's search bar: a 56dp pill.
const barHeight = 56;

// The icon's slot, so in the list's 16dp gutter the text starts where the header's title does (measured on Android 15): 60dp in after ☰'s 44pt slot, 72dp in after Material's back button.
const leadingSlot = { menu: 44, back: 56 } as const;

// Gmail's search bar at the top of a list, as Compose content: tapping it opens full-screen search.
export function DockedSearchFieldContent(
  props: DockedSearchQuery,
): React.JSX.Element | null {
  return <DockedSearchBody {...props} search={useHeaderSearch(props)} />;
}

// The bar at rest; once open, nothing where the app bar took the search, else the open search in its place.
export function DockedSearchBody({
  search,
  ...props
}: DockedSearchQuery & { search: HeaderSearch }): React.JSX.Element | null {
  if (!search.open)
    return <SearchBarPill {...props} onOpen={search.openSearch} />;

  return search.inHeader ? null : (
    <InlineOpenSearch {...props} search={search} />
  );
}

function InlineOpenSearch({
  search,
  ...props
}: DockedSearchQuery & { search: HeaderSearch }): React.JSX.Element {
  return (
    <OpenSearchBarContent
      label={props.label}
      initialValue={props.value}
      onChangeText={props.onChangeText}
      onClose={search.close}
    />
  );
}

type PillProps = Pick<DockedSearchQuery, 'label' | 'leading'> & {
  onOpen: () => void;
};

// A rounded, muted bar: the search icon in a slot that lines the label up with the title.
function SearchBarPill({
  label,
  leading,
  onOpen,
}: PillProps): React.JSX.Element {
  return (
    <Row verticalAlignment="center" modifiers={usePillModifiers(label, onOpen)}>
      <SearchIcon leading={leading} />
      <Box contentAlignment="centerStart" modifiers={[weight(1)]}>
        <SearchLabel label={label} />
      </Box>
    </Row>
  );
}

function SearchIcon({
  leading,
}: Pick<DockedSearchQuery, 'leading'>): React.JSX.Element {
  return (
    <Box
      contentAlignment="center"
      modifiers={[size(leadingSlot[leading], barHeight)]}
    >
      <NativeSymbol name="search" role="action" muted />
    </Box>
  );
}

function usePillModifiers(label: string, onOpen: () => void): ModifierConfig[] {
  const fill = String(useCSSVariable('--color-muted'));

  return [
    fillMaxWidth(),
    height(barHeight),
    roundedClip(barHeight / 2),
    background(fill),
    clickable(onOpen),
    semantics({ contentDescription: label }),
  ];
}

DockedSearchFieldContent satisfies React.ComponentType<DockedSearchQuery>;
