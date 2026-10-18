import type * as React from 'react';
import { useCallback, useMemo, useState } from 'react';
import { Platform, View, type ViewStyle } from 'react-native';
import { useResolveClassNames } from 'uniwind';
import { groupedListGap } from '#primitives/lists/grouped-list';
import { GroupedListSection } from '#primitives/lists/grouped-list-section';
import { List } from '#primitives/lists/list';
import { CardRow } from './card-row';
import {
  type FieldListEntry,
  type FieldListSection,
  fieldListEntries,
  fieldListEntryKey,
  fieldListEntryKind,
} from './field-list-entries';
import { type HoverStore, createHoverStore } from './field-row-hover-store';

export type { FieldListSection } from './field-list-entries';

export interface FieldListProps {
  sections: readonly FieldListSection[];
  testID?: string;
  gap?: 'sm';
}

const rowHeightEstimate = 52;

/*
 * GroupedList's sections as one virtualised list, so a long list mounts only the rows in view.
 * Each title, row and footer is an item; rows round the card's ends and draw separators between them.
 */
export function FieldList(props: FieldListProps): React.JSX.Element {
  const entries = useMemo(
    () => fieldListEntries(props.sections),
    [props.sections],
  );

  return (
    <List
      testID={props.testID}
      {...fieldListDefaults}
      items={entries}
      renderItem={useEntryRenderer(props.gap)}
    />
  );
}

// iOS's glass bars already fade the edges.
const glassBarsFade = { top: 'never', bottom: 'never' } as const;

const fieldListDefaults = {
  edges: Platform.OS === 'ios' ? glassBarsFade : undefined,
  keyExtractor: fieldListEntryKey,
  getItemType: fieldListEntryKind,
  estimatedItemSize: rowHeightEstimate,
  padding: { compact: 4, wide: 0 },
  paddingTop: { compact: 4, wide: 0 },
} as const;

const pixels = (length: ViewStyle['gap']): number => {
  if (typeof length === 'number') return length;

  return typeof length === 'string' ? Number.parseFloat(length) : 0;
};

function useEntryRenderer(
  density: FieldListProps['gap'],
): (item: FieldListEntry, index: number) => React.JSX.Element {
  const sectionGap = useSectionGap(density);
  const [store] = useState(createHoverStore);

  return useCallback(
    (item: FieldListEntry, index: number) => (
      <View style={item.gapAbove ? { paddingTop: sectionGap } : undefined}>
        <EntryContent entry={item} index={index} store={store} />
      </View>
    ),
    [sectionGap, store],
  );
}

function useSectionGap(density: FieldListProps['gap']): number {
  // The web resolves the gap class to rowGap; native resolves it to gap.
  const normal = useResolveClassNames(groupedListGap);
  const small = useResolveClassNames('gap-2');

  return resolvedGap(density === 'sm' ? small : normal);
}

const resolvedGap = (style: ViewStyle): number =>
  pixels(style.rowGap ?? style.gap);

// A title or footer is GroupedListSection's own, with an empty card where the rows would be.
function EntryContent(props: {
  entry: FieldListEntry;
  index: number;
  store: HoverStore;
}): React.JSX.Element {
  const { entry } = props;

  if (entry.kind === 'title')
    return <GroupedListSection title={entry.title}>{null}</GroupedListSection>;

  if (entry.kind === 'footer')
    return (
      <GroupedListSection footer={entry.footer}>{null}</GroupedListSection>
    );

  return <CardRow entry={entry} index={props.index} store={props.store} />;
}
