import { getFieldItemPosition } from '@expo/ui';
import { Column, LazyColumn } from '@expo/ui/jetpack-compose';
import {
  fillMaxSize,
  fillMaxWidth,
  height,
  imePadding,
} from '@expo/ui/jetpack-compose/modifiers';
import { useCallback, type ReactElement, type ReactNode } from 'react';
import {
  Caption,
  caption,
  contentPadding,
  footerInsets,
  rowSpacing,
  sectionBreakHeight,
  titleInsets,
} from '#primitives/fields/field-group';
import { PositionContext } from '#primitives/fields/field-row';
import { NativeGroupedFrame } from './list-native-host';
import { NativeMoveMenu } from './list-native-move-menu';
import type { NativeGroupedProps } from './list-native-props';
import {
  estimatedNativeRowHeight,
  nativeRowKey,
  type NativeRow,
  type NativeSection,
} from './list-native-sections';

/*
 * The FieldGroup's layout (field-group-caption-insets.ts) as one lazy column. Every item of the column is a lazy
 * item, so a title, a footer and the gap each take the column's own 2dp spacing off the space they add.
 */
const listModifiers = [fillMaxSize(), imePadding()];

/*
 * ADR-0042: a grouped List on Android is Compose's `LazyColumn` whose rows are `LazyColumn.Items` Expo recycles, drawn
 * as Material's connected rows as Expo's FieldSection.android.tsx does (rounded ends, small corners between, 2dp
 * gaps; each row clips itself by the position it is given). Its rows are FieldGroup rows, as in a FieldGroup.
 */
export function NativeGroupedList(props: NativeGroupedProps): ReactNode {
  return <NativeGroupedFrame list={props}>{groupedColumn}</NativeGroupedFrame>;
}

const groupedColumn = (sections: NativeSection[]): ReactElement => (
  <GroupedColumn sections={sections} />
);

function GroupedColumn(props: { sections: NativeSection[] }): ReactElement {
  return (
    <LazyColumn
      verticalArrangement={{ spacedBy: rowSpacing }}
      contentPadding={contentPadding}
      modifiers={listModifiers}
    >
      {props.sections.map(groupedSection)}
    </LazyColumn>
  );
}

const groupedSection = (
  section: NativeSection,
  index: number,
  all: NativeSection[],
): ReactElement => (
  <GroupedSection
    key={section.key}
    section={section}
    last={index === all.length - 1}
  />
);

// The title and footer sit 12dp and 8dp from the rows in a FieldGroup (4dp spacing and 8 or 4 of padding).
const withinColumn = (insets: typeof titleInsets): typeof titleInsets => ({
  ...insets,
  top: Math.max(insets.top - rowSpacing, 0),
  bottom: Math.max(insets.bottom - rowSpacing, 0),
});

type SectionProps = { section: NativeSection; last: boolean };

// Lazy items the column reads as its own children: the title, the rows, the footer and the gap.
function GroupedSection({ section, last }: SectionProps): ReactElement {
  return (
    <>
      <Caption
        {...caption(section.title, withinColumn(titleInsets), 'heading')}
      />
      <SectionRows section={section} />
      <Caption
        {...caption(section.footer, withinColumn(footerInsets), 'secondary')}
      />
      {last ? null : <Gap />}
    </>
  );
}

/*
 * Each row is told where it sits in its section, for the corners of Material's connected rows. A row the List can
 * move opens its Move menu on a long press, and does not drag: Expo UI's LazyColumn exposes no reordering, nor any
 * drag and drop, to hand a Compose row to.
 */
function usePositionedRow(
  count: number,
): (info: { item: NativeRow; index: number }) => ReactElement {
  return useCallback(
    ({ item, index }) => (
      <PositionContext.Provider value={getFieldItemPosition(index, count)}>
        <NativeMoveMenu id={item.moveId}>{item.render()}</NativeMoveMenu>
      </PositionContext.Provider>
    ),
    [count],
  );
}

function SectionRows({ section }: { section: NativeSection }): ReactElement {
  return (
    <LazyColumn.Items
      data={section.rows}
      keyExtractor={nativeRowKey}
      estimatedItemSize={estimatedNativeRowHeight}
    >
      {usePositionedRow(section.rows.length)}
    </LazyColumn.Items>
  );
}

const gapModifiers = [fillMaxWidth(), height(sectionBreakHeight)];

const Gap = (): ReactElement => <Column modifiers={gapModifiers} />;
