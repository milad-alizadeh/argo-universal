import type { LegendListRenderItemProps } from '@legendapp/list/react-native';
import { useCallback, useMemo, type ReactElement, type ReactNode } from 'react';
import { View } from 'react-native';
import { useSpacingStep } from '#primitives/layout/spacing';
import { Spinner } from '#primitives/status/spinner';
import {
  ListContext,
  listPosition,
  type ListPosition,
} from '../../../list-context';
import { useInMenu } from '../../../menu-rows-context';
import { useSizeClassValue } from '../../../use-size-class/use-size-class-value';
import { listInsets } from './list-insets';
import type { ListProps } from './list-props';

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

function neighborSection<Item>(
  item: Item | undefined,
  getKey: (item: Item) => string | undefined,
): string | undefined {
  return item === undefined ? undefined : getKey(item);
}

function differentSection<Item>(
  props: ListProps<Item>,
  index: number,
  neighbor: number,
): boolean {
  const { items = [], getSectionKey } = props;

  if (!getSectionKey) return false;

  return (
    neighborSection(items[index], getSectionKey) !==
    neighborSection(items[neighbor], getSectionKey)
  );
}

function startsSection<Item>(props: ListProps<Item>, index: number): boolean {
  return index === 0 || differentSection(props, index, index - 1);
}

function endsSection<Item>(props: ListProps<Item>, index: number): boolean {
  const { items = [] } = props;

  return (
    index === items.length - 1 || differentSection(props, index, index + 1)
  );
}

function positionOf<Item>(props: ListProps<Item>, index: number): ListPosition {
  return listPosition(startsSection(props, index), endsSection(props, index));
}

interface RowProps<Item> {
  row: LegendListRenderItemProps<Item>;
  props: ListProps<Item>;
}

function Row<Item>({ row, props }: RowProps<Item>): ReactElement {
  const appearance = props.appearance ?? 'plain';
  const position = positionOf(props, row.index);

  const context = useMemo(
    () => ({ appearance, position }),
    [appearance, position],
  );

  return (
    <ListContext value={context}>
      <PaddedRow row={row} props={props} />
    </ListContext>
  );
}

// Legend List's web cells ignore horizontal content padding, so each row holds its gutters.
function PaddedRow<Item>({ row, props }: RowProps<Item>): ReactNode {
  const paddingHorizontal = usePadding(listInsets(props, useInMenu()).padding);
  const style = useMemo(() => ({ paddingHorizontal }), [paddingHorizontal]);
  const content = props.renderItem?.(row.item, row.index);

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

export function useListPadding<Item>(props: ListProps<Item>): {
  paddingTop: number;
  paddingBottom?: number;
} {
  const insets = listInsets(props, useInMenu());
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
