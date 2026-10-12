import type { LegendListRenderItemProps } from '@legendapp/list/react-native';
import type * as React from 'react';
import { useCallback, useMemo } from 'react';
import { Platform, View, type ViewStyle } from 'react-native';
import { useResolveClassNames } from 'uniwind';
import { FieldSection } from '#primitives/field-section';
import { listTestIdProps } from '../generic/list-test-id';
import {
  FieldRowEnd,
  fieldGroupGap,
  fieldGroupPadding,
} from '../generic/primitives/field-layout';
import { cn } from '../generic/utils';
import {
  type FieldListEntry,
  type FieldListSection,
  fieldListEntries,
  fieldListEntryKey,
  fieldListEntryKind,
} from './field-list-entries';
import { ScrollFadeList } from './scroll-fade-list';

export type { FieldListSection } from './field-list-entries';
export interface FieldListProps {
  sections: readonly FieldListSection[];
  testID?: string;
}

// The Settings page's surface: the phone's page, or the shell behind a wide window's page.
const fadeSurface = 'bg-sidebar';
const rowHeightEstimate = 52;

/*
 * FieldGroup's sections as one virtualised list, so a long list mounts only the rows in view.
 * Each title, row and footer is an item; rows round the card's ends and draw separators between them.
 */
export function FieldList({
  sections,
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
      contentContainerStyle={useGroupPadding()}
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
  const { rowGap } = useResolveClassNames(fieldGroupGap);
  return useCallback(
    ({ item }: LegendListRenderItemProps<FieldListEntry>) => (
      <View style={item.gapAbove ? { paddingTop: pixels(rowGap) } : undefined}>
        <EntryContent entry={item} />
      </View>
    ),
    [rowGap],
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
      <FieldRowEnd value={last}>{row}</FieldRowEnd>
    </View>
  );
}
