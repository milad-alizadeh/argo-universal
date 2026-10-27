import { useContext, type ReactElement, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { ContextActions } from '#primitives/actions/action';
import { useListItemGroup } from '#primitives/lists/list';
import { ListContext, ListTileContext } from '../../../list-context';
import { useCompactRows, useListLook } from '../../../list-look-context';
import { loadingLanes } from '../../../list-skeleton-lanes';
import { nestedRows, nestsChildren } from '../../../list-tree';
import { useInMenu } from '../../../menu-rows-context';
import { useRowDrawing } from '../../../row-drawing-context';
import { useSeparatorCovered } from '../../../row-highlights';
import {
  useContentItemDrawing,
  useContentItemActions,
  useSelectedSeparator,
} from './list-item-content-selection';
import { drawingContent } from './list-item-drawing-content';
import { NestingItem } from './list-item-nesting';
import { hasLeading, LinkAccessory, separatorClass } from './list-item-parts';
import { ItemPress, type DrawingProps } from './list-item-press';
import { ItemProgress } from './list-item-progress';
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
  const { position } = useContext(ListContext);

  return {
    look: useListLook(),
    position,
    menu: useInMenu(),
    rows: useRowDrawing(),
    compact: useCompactRows(),
  };
}

function ItemSeparator(props: ListItemProps): ReactNode {
  const { index } = useContext(ListContext);
  const highlighted = useSeparatorCovered(index);
  const selected = useSelectedSeparator(props.id);
  const covered = [highlighted, selected].some(Boolean);
  const separator = itemSeparator(useItemDrawing(), hasLeading(props));

  if (covered) return null;

  return separator ? (
    <View
      className={separatorClass(separator, props.leadingSize)}
      style={hairline}
    />
  ) : null;
}

function Selection({ selected }: Pick<ListItemProps, 'selected'>): ReactNode {
  return selected ? (
    <View pointerEvents="none" aria-hidden className={selectionTint} />
  ) : null;
}

export function ListItemFrame(props: DrawingProps): ReactElement {
  const { context, footer } = useListItemGroup(props.description);
  const actions = useContentItemActions(props);

  return (
    <ContextActions actions={actions} menu={props.contextMenu}>
      <>
        <ListContext value={context}>
          <ItemSurface {...props} />
        </ListContext>
        {footer}
      </>
    </ContextActions>
  );
}

/*
 * A chosen row shows its check only, with no selected fill. Every choosing List
 * draws that check, on a menu row and in a sheet's grouped card alike, so none of them tints the
 * row behind it; a tint there is the web leaking into a stock picker, and it paints over the
 * separator under the chosen row. A selected row without a check, such as the Sessions sidebar's,
 * keeps its tint: it is the only mark that row carries.
 */
function ItemSurface(props: DrawingProps): ReactElement {
  const drawing = useItemDrawing();
  const tile = useContext(ListTileContext);

  const className = tile
    ? 'relative overflow-hidden rounded-3xl bg-card'
    : itemSurface(drawing, props);

  return (
    <View className={className}>
      <PressedContent props={props} drawing={drawing} tile={tile !== null} />
      <RowDetails tile={tile !== null} props={props} />
    </View>
  );
}

// A loading row keeps the row's surface, lanes and line heights, with nothing to press or read.
function LoadingItem(props: ListItemProps): ReactElement {
  return <ListItemFrame title={props.title} {...loadingLanes(props)} />;
}

export function ListItem({ children, ...props }: ListItemProps): ReactElement {
  if (props.isLoading) return <LoadingItem {...props} />;

  const rows = nestedRows(children);

  if (rows.length === 0) return <ChoosingItem {...props} />;

  return <NestingItem row={<ChoosingItem {...props} />} rows={rows} />;
}

// A List lifts child ListItems to rows of their own; it hands them on to this row's tree lane instead.
nestsChildren(ListItem);

// A menu row's check leads the row; elsewhere only a choosing List draws it, trailing.
function ChoosingItem({ disclosure, ...props }: ListItemProps): ReactElement {
  const selected = useItemSelection(props);
  const menu = useInMenu();

  const drawing = useContentItemDrawing({
    ...selected,
    choice: menu ? <ChoiceSlot {...selected} /> : undefined,
    accessory:
      useTrailingChoice(menu, selected) ?? disclosureAccessory(disclosure),
  });

  return <ListItemFrame {...drawing} />;
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

function RowDetails({
  tile,
  props,
}: {
  tile: boolean;
  props: DrawingProps;
}): ReactNode {
  if (tile) return null;

  return (
    <>
      <ItemSeparator {...props} />
      <ItemProgress progress={props.progress} sidebar={props.sidebar} />
    </>
  );
}

interface PressedProps {
  props: DrawingProps;
  drawing: ItemDrawing;
  tile: boolean;
}

function PressedContent({ props, drawing, tile }: PressedProps): ReactElement {
  const { selectionMode } = useContext(ListContext);

  return (
    <>
      <ItemPress {...drawingContent(props, tile)} />
      <Selection selected={props.selected && !drawing.menu && !selectionMode} />
    </>
  );
}
