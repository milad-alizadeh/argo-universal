import type { LegendListRenderItemProps } from '@legendapp/list/react-native';
import type * as React from 'react';
import { useCallback, useMemo, useState } from 'react';
import { Platform, View, type ViewStyle } from 'react-native';
import { useResolveClassNames } from 'uniwind';
import {
  fieldGroupGap,
  fieldGroupPadding,
} from '#primitives/fields/field-layout';
import { FieldSection } from '#primitives/fields/field-section/field-section-view';
import type { ListSearchBarProps } from '#primitives/inputs/list-search-bar/list-search-bar';
import { listTestIdProps } from '../../generic/list-test-id';
import { ScrollFadeList } from '../scroll-fade/scroll-fade-list';
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
  // A phone's search above the sections; the native FieldGroup draws it, as a wide window searches from its title row.
  search?: ListSearchBarProps;
  testID?: string;
}

// The Settings page's surface: the phone's page, or the shell behind a wide window's page.
const fadeSurface = 'bg-sidebar';

const rowHeightEstimate = 52;

/*
 * FieldGroup's sections as one virtualised list, so a long list mounts only the rows in view.
 * Each title, row and footer is an item; rows round the card's ends and draw separators between them.
 */
export function FieldList(props: FieldListProps): React.JSX.Element {
  const entries = useMemo(
    () => fieldListEntries(props.sections),
    [props.sections],
  );

  return (
    <ScrollFadeList
      {...listTestIdPropsFor(props.testID)}
      {...fieldListDefaults}
      contentContainerStyle={useGroupPadding()}
      data={entries}
      renderItem={useEntryRenderer()}
    />
  );
}

// iOS's glass bars already fade the edges.
const glassBarsFade = { top: 'never', bottom: 'never' } as const;

const fieldListDefaults = {
  surfaceClassName: fadeSurface,
  edges: Platform.OS === 'ios' ? glassBarsFade : undefined,
  keyExtractor: fieldListEntryKey,
  getItemType: fieldListEntryKind,
  estimatedItemSize: rowHeightEstimate,
};

function listTestIdPropsFor(
  testID: string | undefined,
): Partial<ReturnType<typeof listTestIdProps>> {
  return testID ? listTestIdProps(testID) : {};
}

type PaddingKey = keyof Pick<
  ViewStyle,
  | 'paddingInlineStart'
  | 'paddingInlineEnd'
  | 'paddingLeft'
  | 'paddingRight'
  | 'paddingHorizontal'
>;

// The web resolves a class to a CSS length such as "16px"; native resolves it to a number.
type ResolvedLength = ViewStyle['gap'] | Exclude<ViewStyle[PaddingKey], string>;

const pixels = (length: ResolvedLength): number => {
  if (typeof length === 'number') return length;

  return typeof length === 'string' ? Number.parseFloat(length) : 0;
};

const isSet = (value: ResolvedLength): boolean =>
  value !== undefined && value !== null;

function firstLength(style: ViewStyle, keys: readonly PaddingKey[]): number {
  return pixels(keys.map((key) => style[key]).find(isSet));
}

const startPaddingKeys = [
  'paddingInlineStart',
  'paddingLeft',
  'paddingHorizontal',
] as const;

const endPaddingKeys = [
  'paddingInlineEnd',
  'paddingRight',
  'paddingHorizontal',
] as const;

// FieldGroup's gutters, in the numbers Legend List lays its items out with.
function useGroupPadding(): ViewStyle {
  const padding = useResolveClassNames(fieldGroupPadding);

  return {
    paddingLeft: firstLength(padding, startPaddingKeys),
    paddingRight: firstLength(padding, endPaddingKeys),
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
  const [store] = useState(createHoverStore);

  return useCallback(
    ({ item, index }: LegendListRenderItemProps<FieldListEntry>) => (
      <View style={item.gapAbove ? { paddingTop: sectionGap } : undefined}>
        <EntryContent entry={item} index={index} store={store} />
      </View>
    ),
    [sectionGap, store],
  );
}

// A title or footer is FieldSection's own, with an empty card where the rows would be.
function EntryContent(props: {
  entry: FieldListEntry;
  index: number;
  store: HoverStore;
}): React.JSX.Element {
  const { entry } = props;

  if (entry.kind === 'title')
    return <FieldSection title={entry.title}>{null}</FieldSection>;

  if (entry.kind === 'footer')
    return <FieldSection footer={entry.footer}>{null}</FieldSection>;

  return <CardRow entry={entry} index={props.index} store={props.store} />;
}
