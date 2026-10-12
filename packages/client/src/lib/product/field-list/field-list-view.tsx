import type { LegendListRenderItemProps } from '@legendapp/list/react-native';
import type * as React from 'react';
import { useCallback, useMemo } from 'react';
import { Platform, View, type ViewStyle } from 'react-native';
import { useResolveClassNames } from 'uniwind';
import { listTestIdProps } from '../../generic/list-test-id';
import {
  FieldRowEnd,
  fieldGroupGap,
  fieldGroupPadding,
} from '../../generic/primitives/fields/field-layout';
import { FieldSection } from '../../generic/primitives/fields/field-section/field-section-rn';
import type { ListSearchBarProps } from '../../generic/primitives/inputs/list-search-bar/list-search-bar';
import { ListItemHost } from '../../generic/primitives/lists/list-item/list-item-host';
import { cn } from '../../generic/utils';
import { PhoneListSearch } from '../phone-list-search';
import { ScrollFadeList } from '../scroll-fade/scroll-fade-list';
import {
  type FieldListEntry,
  type FieldListSection,
  fieldListEntries,
  fieldListEntryKey,
  fieldListEntryKind,
} from './field-list-entries';

export type { FieldListSection } from './field-list-entries';
export interface FieldListProps {
  sections: readonly FieldListSection[];
  // A phone's search above the sections, scrolling with them, where the platform draws it in the list; a wide window searches from its title row.
  search?: ListSearchBarProps;
  testID?: string;
}

// The Settings page's surface: the phone's page, or the shell behind a wide window's page.
const fadeSurface = 'bg-sidebar';
const rowHeightEstimate = 52;
// An iOS list starts below the transparent header and ends above the docked search bar.
const headerInsets =
  Platform.OS === 'ios'
    ? { contentInsetAdjustmentBehavior: 'automatic' as const }
    : {};

/*
 * FieldGroup's sections as one virtualised list at every width, so a long list mounts only the rows in view.
 * Each title, row and footer is an item; rows round the card's ends and draw separators between them.
 * A phone draws each row natively in a Host of its own; titles and footers are React Native text.
 */
export function FieldList({
  sections,
  search,
  testID,
}: FieldListProps): React.JSX.Element {
  const entries = useMemo(() => fieldListEntries(sections), [sections]);
  const renderItem = useEntryRenderer();
  return (
    <ScrollFadeList
      {...(testID ? listTestIdProps(testID) : {})}
      surfaceClassName={fadeSurface}
      // iOS's glass bars already fade the edges.
      fade={Platform.OS !== 'ios'}
      {...headerInsets}
      contentContainerStyle={useGroupPadding()}
      ListHeaderComponent={
        search && <PhoneListSearch {...search} className="pb-6" />
      }
      data={entries}
      keyExtractor={fieldListEntryKey}
      getItemType={fieldListEntryKind}
      estimatedItemSize={rowHeightEstimate}
      renderItem={renderItem}
    />
  );
}

// The web resolves a class to a CSS length such as "16px"; native resolves it to a number.
const pixels = (length: unknown): number => {
  if (typeof length === 'number') return length;
  return typeof length === 'string' ? Number.parseFloat(length) : 0;
};

// FieldGroup's gutters, in the numbers Legend List lays its items out with.
function useGroupPadding(): ViewStyle {
  const padding = useResolveClassNames(fieldGroupPadding);
  return {
    paddingLeft: pixels(
      padding.paddingInlineStart ??
        padding.paddingLeft ??
        padding.paddingHorizontal,
    ),
    paddingRight: pixels(
      padding.paddingInlineEnd ??
        padding.paddingRight ??
        padding.paddingHorizontal,
    ),
    paddingTop: pixels(padding.paddingTop),
    paddingBottom: pixels(padding.paddingBottom),
  };
}

function useEntryRenderer(): (
  props: LegendListRenderItemProps<FieldListEntry>,
) => React.JSX.Element {
  // The web resolves the gap class to rowGap; native resolves it to gap.
  const { rowGap, gap } = useResolveClassNames(fieldGroupGap);
  const sectionGap = pixels(rowGap ?? gap);
  return useCallback(
    ({ item }: LegendListRenderItemProps<FieldListEntry>) => (
      <View style={item.gapAbove ? { paddingTop: sectionGap } : undefined}>
        <EntryContent entry={item} />
      </View>
    ),
    [sectionGap],
  );
}

// A title or footer is FieldSection's own, with an empty card where the rows would be.
function EntryContent({ entry }: { entry: FieldListEntry }): React.JSX.Element {
  if (entry.kind === 'title')
    return <FieldSection title={entry.title}>{null}</FieldSection>;
  if (entry.kind === 'footer')
    return <FieldSection footer={entry.footer}>{null}</FieldSection>;
  return <CardRow entry={entry} />;
}

// One row of the section's card: the first rounds its top, the last its bottom and drops its separator.
function CardRow({
  entry: { row, first, last },
}: {
  entry: Extract<FieldListEntry, { kind: 'row' }>;
}): React.JSX.Element {
  return (
    <View
      className={cn(
        'overflow-hidden',
        first && 'rounded-t-2xl',
        last && 'rounded-b-2xl',
      )}
    >
      <FieldRowEnd value={last}>
        <ListItemHost>{row}</ListItemHost>
      </FieldRowEnd>
    </View>
  );
}
