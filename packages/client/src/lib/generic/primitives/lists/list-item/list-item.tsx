import { useContext, type ReactElement, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useListItemGroup } from '#primitives/lists/list';
import { ProgressBar } from '#primitives/status/progress-bar';
import { ListContext } from '../../../list-context';
import { InListItem } from '../../../list-item-control-context';
import { SkeletonContent, SkeletonMark } from '../../../list-skeleton';
import { useInMenu } from '../../../menu-rows-context';
import { useRowDrawing } from '../../../row-drawing-context';
import { useSeparatorCovered } from '../../../row-highlights';
import { hasLeading, LinkAccessory, separatorClass } from './list-item-parts';
import { placedContent } from './list-item-placement';
import { ItemPress, type DrawingProps } from './list-item-press';
import type { ListItemProps } from './list-item-props';
import {
  useItemSelection,
  ChoiceAccessory,
  ChoiceSlot,
} from './list-item-selection';
import {
  itemSeparator,
  itemSurface,
  selectionTint,
  type ItemDrawing,
} from './list-item-styles';

const hairline = { height: StyleSheet.hairlineWidth };

function useItemDrawing(): ItemDrawing {
  const { appearance, position } = useContext(ListContext);

  return { appearance, position, menu: useInMenu(), rows: useRowDrawing() };
}

function ItemSeparator(props: ListItemProps): ReactNode {
  const { index } = useContext(ListContext);
  const covered = useSeparatorCovered(index);
  const separator = itemSeparator(useItemDrawing(), hasLeading(props));

  return separator && !covered ? (
    <View
      className={separatorClass(separator, props.leadingSize)}
      style={hairline}
    />
  ) : null;
}

// Paper "SessionsList": a sidebar row's bar runs under its content, 4 above the row's end, on a hairline track.
function ItemProgress({
  progress,
  sidebar,
}: Pick<ListItemProps, 'progress' | 'sidebar'>): ReactNode {
  if (!progress) return null;

  return sidebar ? (
    <View className="absolute bottom-1 left-9.5 right-3">
      <ProgressBar {...progress} track="hairline" />
    </View>
  ) : (
    <View className="absolute inset-x-0 bottom-0">
      <ProgressBar {...progress} />
    </View>
  );
}

function Selection({
  selected,
  drawing,
}: Pick<ListItemProps, 'selected'> & { drawing: ItemDrawing }): ReactNode {
  return selected ? (
    <View pointerEvents="none" aria-hidden className={selectionTint(drawing)} />
  ) : null;
}

export function ListItemFrame(props: DrawingProps): ReactElement {
  const { context, footer } = useListItemGroup(props.description);

  return (
    <InListItem value>
      <ListContext value={context}>
        <ItemSurface {...props} />
      </ListContext>
      {footer}
    </InListItem>
  );
}

/*
 * Paper's Combobox: a chosen row shows its check only, with no selected fill. Every choosing List
 * draws that check, on a menu row and in a sheet's grouped card alike, so none of them tints the
 * row behind it; a tint there is the web leaking into a stock picker, and it paints over the
 * separator under the chosen row. A selected row without a check, such as the Sessions sidebar's,
 * keeps its tint: it is the only mark that row carries.
 */
function ItemSurface(props: DrawingProps): ReactElement {
  const drawing = useItemDrawing();
  const { selectionMode } = useContext(ListContext);

  return (
    <View className={itemSurface(drawing, props)}>
      <ItemPress {...drawingContent(props)} />
      <Selection
        selected={props.selected && !drawing.menu && !selectionMode}
        drawing={drawing}
      />
      <ItemSeparator {...props} />
      <ItemProgress progress={props.progress} sidebar={props.sidebar} />
    </View>
  );
}

// A loading row keeps the row's surface, lanes and line heights, with nothing to press or read.
function LoadingItem(props: ListItemProps): ReactElement {
  return (
    <ListItemFrame
      title={props.title}
      leading={props.leading === undefined ? undefined : <SkeletonMark />}
      content={<SkeletonContent {...props} />}
    />
  );
}

export function ListItem(props: ListItemProps): ReactElement {
  if (props.isLoading) return <LoadingItem {...props} />;

  return <ChoosingItem {...props} />;
}

// A menu row's check leads the row, as in Paper's Combobox; elsewhere only a choosing List draws it, trailing.
function ChoosingItem({ disclosure, ...props }: ListItemProps): ReactElement {
  const selected = useItemSelection(props);
  const menu = useInMenu();

  return (
    <ListItemFrame
      {...selected}
      choice={menu ? <ChoiceSlot {...selected} /> : undefined}
      accessory={
        useTrailingChoice(menu, selected) ?? disclosureAccessory(disclosure)
      }
    />
  );
}

// A row that pushes a page outside a choosing List shows the disclosure chevron.
const disclosureAccessory = (disclosure?: boolean): ReactElement | undefined =>
  disclosure ? <LinkAccessory /> : undefined;

// An empty trailing choice would hold the trailing lane off the row's edge.
function useTrailingChoice(
  menu: boolean,
  selected: ListItemProps,
): ReactElement | undefined {
  const { selectionMode } = useContext(ListContext);

  if (menu || !selectionMode) return undefined;

  return <ChoiceAccessory {...selected} />;
}

function drawingContent(props: DrawingProps): DrawingProps {
  return {
    ...placedContent(props),
    accessibilityLabel:
      props.accessibilityLabel ??
      [props.title, props.value].filter(Boolean).join(', '),
  };
}
