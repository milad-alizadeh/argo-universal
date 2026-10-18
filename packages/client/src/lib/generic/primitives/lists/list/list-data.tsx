import type { LegendListRenderItemProps } from '@legendapp/list/react-native';
import { useCallback, useMemo, type ReactElement } from 'react';
import { View } from 'react-native';
import { Spinner } from '#primitives/status/spinner';
import {
  ListContext,
  listPosition,
  type ListPosition,
} from '../../../list-context';
import { useSizeClassValue } from '../../../use-size-class/use-size-class-value';
import { useSpacing } from '../../../use-spacing';
import type { ListProps } from './list-props';

export function ListEmpty({
  isLoading,
  empty,
}: Pick<ListProps<never>, 'isLoading' | 'empty'>): ReactElement {
  return (
    <View className="items-center py-8">
      {isLoading ? <Spinner accessibilityLabel="Loading" /> : empty}
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
      {props.renderItem?.(row.item, row.index)}
    </ListContext>
  );
}

export function useRenderedRows<Item>(
  props: ListProps<Item>,
): (row: LegendListRenderItemProps<Item>) => ReactElement {
  return useCallback((row) => <Row row={row} props={props} />, [props]);
}

function usePaddingStep(step: number): number {
  const value = useSpacing(`--spacing-${step === 0 ? 1 : step}`);

  return step === 0 ? 0 : value;
}

export function useListPadding<Item>(props: ListProps<Item>): {
  paddingHorizontal: number;
  paddingTop: number;
} {
  const paddingHorizontal = usePaddingStep(
    useSizeClassValue(props.padding ?? 0),
  );

  const paddingTop = usePaddingStep(useSizeClassValue(props.paddingTop ?? 0));

  return useMemo(
    () => ({ paddingHorizontal, paddingTop }),
    [paddingHorizontal, paddingTop],
  );
}
