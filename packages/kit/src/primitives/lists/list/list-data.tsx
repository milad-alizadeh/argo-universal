import type { LegendListRenderItemProps } from '@legendapp/list/react-native';
import { useCallback, useMemo, type ReactElement, type ReactNode } from 'react';
import { View } from 'react-native';
import { useSpacingStep } from '#primitives/layout/spacing';
import { Spinner } from '#primitives/status/spinner';
import type { ListInsets } from '../../../list-look';
import { useListLook } from '../../../list-look-context';
import { useSizeClassValue } from '../../../use-size-class/use-size-class-value';
import { ContentRowId } from './list-content-selection';
import { DataListRow } from './list-grouping';
import type { ListProps } from './list-props';
import {
  renderedId,
  rowId,
  sectionPart,
  selectionId,
} from './list-row-identity';

export function ListEmpty({
  isLoading,
  empty,
}: Pick<ListProps<never>, 'isLoading' | 'empty'>): ReactNode {
  if (!isLoading) return empty ?? null;

  return (
    <View className="items-center py-8">
      <Spinner accessibilityLabel="Loading" />
    </View>
  );
}

interface RowProps<Item> {
  row: LegendListRenderItemProps<Item>;
  props: ListProps<Item>;
}

// A header, footer or gap the caller renders as an item says so with the item type 'section', as a List's own children do.
const isPart = <Item,>({ row, props }: RowProps<Item>): boolean =>
  sectionPart(props, row.item, row.index);

const partOrRowId = <Item,>(
  rowProps: RowProps<Item>,
  content: ReactNode,
): string | undefined =>
  isPart(rowProps)
    ? undefined
    : rowId(
        renderedId(content),
        selectionId(rowProps.props, rowProps.row.item, rowProps.row.index),
      );

function Row<Item>(rowProps: RowProps<Item>): ReactElement {
  const { row, props } = rowProps;
  const content = props.renderItem?.(row.item, row.index);

  const id = partOrRowId(rowProps, content);

  return (
    <DataListRow index={row.index} part={isPart(rowProps)}>
      <ContentRowId value={id}>
        <PaddedRow content={content} props={props} />
      </ContentRowId>
    </DataListRow>
  );
}

// Legend List's web cells ignore horizontal content padding, so each row holds its gutters.
function PaddedRow<Item>({
  content,
  props,
}: {
  content: ReactNode;
  props: ListProps<Item>;
}): ReactNode {
  const paddingHorizontal = useRowGutter(props);
  const style = useMemo(() => ({ paddingHorizontal }), [paddingHorizontal]);

  return paddingHorizontal === 0 ? (
    content
  ) : (
    <View style={style}>{content}</View>
  );
}

export function useRenderedRows<Item>(
  props: ListProps<Item>,
): (row: LegendListRenderItemProps<Item>) => ReactElement {
  return useCallback((row) => <Row row={row} props={props} />, [props]);
}

function usePadding(value: ListProps<never>['padding']): number {
  return useSpacingStep(useSizeClassValue(value ?? 0));
}

const insetOr = <Key extends keyof ListInsets>(
  key: Key,
  props: ListInsets,
  held: ListInsets,
): ListInsets[Key] => props[key] ?? held[key];

// What the caller sets over what the List's look holds.
function useListInsets<Item>(props: ListProps<Item>): ListInsets {
  const { insets, phonePadding } = useListLook();

  return {
    padding: phonePadding ?? insetOr('padding', props, insets),
    paddingTop: insetOr('paddingTop', props, insets),
    paddingBottom: insetOr('paddingBottom', props, insets),
  };
}

// The side space every row holds, which the header holds too.
export function useRowGutter<Item>(props: ListProps<Item>): number {
  return usePadding(useListInsets(props).padding);
}

export function useListPadding<Item>(props: ListProps<Item>): {
  paddingTop: number;
  paddingBottom?: number;
} {
  const insets = useListInsets(props);
  const paddingTop = usePadding(insets.paddingTop);
  const bottom = usePadding(insets.paddingBottom);
  const paddingBottom = insets.paddingBottom === undefined ? undefined : bottom;

  return useMemo(
    () => ({ paddingTop, ...bottomPadding(paddingBottom) }),
    [paddingTop, paddingBottom],
  );
}

function bottomPadding(paddingBottom: number | undefined): {
  paddingBottom?: number;
} {
  return paddingBottom === undefined ? {} : { paddingBottom };
}
