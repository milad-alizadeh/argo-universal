import { useContext, type ReactElement, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { ContextActions } from '#primitives/actions/action';
import { useListItemGroup, useMoveActions } from '#primitives/lists/list';
import { useSkeletonLoading } from '#primitives/status/skeleton';
import { ListTileContext, RowPositionContext } from '../../../list-context';
import { useCompactRows, useListLook } from '../../../list-look-context';
import { nestedRows, nestsChildren } from '../../../list-tree';
import { useSeparatorCovered } from '../../../row-highlights';
import { drawsMovePicker } from '../list/list-move-picker-drawing';
import {
  drawsPlaceholderRows,
  type PlaceholderRowProps,
} from '../list/list-placeholder';
import {
  useContentItemDrawing,
  useContentItemActions,
  useSelectedSeparator,
} from './list-item-content-selection';
import { drawingContent } from './list-item-drawing-content';
import { RowMovePicker } from './list-item-move-picker';
import { NestingItem } from './list-item-nesting';
import { hasLeading, separatorClass } from './list-item-parts';
import { ItemPress, rowMenu, type DrawingProps } from './list-item-press';
import { ItemProgress } from './list-item-progress';
import type { ListItemProps } from './list-item-props';
import {
  disclosureAccessory,
  useItemSelection,
  useTrailingChoice,
  ChoiceSlot,
  SelectionTint,
} from './list-item-selection';
import {
  itemSeparator,
  itemSurface,
  type ItemDrawing,
} from './list-item-styles';

const hairline = { height: StyleSheet.hairlineWidth };

const tileSurface = 'relative overflow-hidden rounded-3xl bg-card';

function useItemDrawing(props: Pick<ListItemProps, 'sidebar'>): ItemDrawing {
  const { position } = useContext(RowPositionContext);

  return {
    look: useListLook(),
    position,
    compact: useCompactRows(props.sidebar),
  };
}

function ItemSeparator({
  separator,
  ...props
}: ListItemProps & { separator: string }): ReactNode {
  const { index } = useContext(RowPositionContext);
  const highlighted = useSeparatorCovered(index);
  const selected = useSelectedSeparator(props.id);

  if ([highlighted, selected].some(Boolean)) return null;

  return (
    <View
      className={separatorClass(separator, props.leadingSize)}
      style={hairline}
    />
  );
}

export function ListItemFrame(props: DrawingProps): ReactElement {
  const { context, footer } = useListItemGroup(props.description);
  const actions = useContentItemActions(props);
  const moves = useMoveActions(props.id);

  return (
    <ContextActions actions={actions} builtIn={moves} menu={rowMenu(props)}>
      <>
        <RowPositionContext value={context}>
          <ItemSurface {...props} />
        </RowPositionContext>
        {footer}
      </>
    </ContextActions>
  );
}

// A chosen row shows its check only, with no selected fill; a selected row without a check keeps its tint.
function ItemSurface(props: DrawingProps): ReactElement {
  const drawing = useItemDrawing(props);
  const tile = useContext(ListTileContext);
  // A row a Skeleton holds is a placeholder whose title is a width, so the row hides its own label. Both Skeletons hide everything they hold as well; this says it on the row itself, which is where the web story can see it. Skeleton.Ignore sets the context false.
  const loading = useSkeletonLoading();

  return (
    <View
      className={tile ? tileSurface : itemSurface(drawing, props)}
      aria-hidden={loading || undefined}
    >
      <PressedContent props={props} drawing={drawing} tile={tile !== null} />
      <RowDetails tile={tile !== null} props={props} drawing={drawing} />
      <RowMovePicker id={props.id} Row={ListItem} />
    </View>
  );
}

export function ListItem({ children, ...props }: ListItemProps): ReactElement {
  const rows = nestedRows(children);

  if (rows.length === 0) return <ChoosingItem {...props} />;

  return <NestingItem row={<ChoosingItem {...props} />} rows={rows} />;
}

// A List lifts child ListItems to rows of their own; it hands them on to this row's tree lane instead.
nestsChildren(ListItem);

// A native grouped List's FieldGroup rows open the same Move to… picker, its places listed as ListItems.
drawsMovePicker(({ id }) => <RowMovePicker id={id} Row={ListItem} />);

// A List with no rows of its own stands in for itself with rows of this shape.
drawsPlaceholderRows((props: PlaceholderRowProps) => <ListItem {...props} />);

// A row's props, and whether it draws as a tile.
interface RowParts {
  props: DrawingProps;
  tile: boolean;
}

// A menu row's check leads the row; elsewhere only a choosing List draws it, trailing.
function ChoosingItem({ disclosure, ...props }: ListItemProps): ReactElement {
  const selected = useItemSelection(props);
  const { menu } = useListLook();

  const drawing = useContentItemDrawing({
    ...selected,
    choice: menu ? <ChoiceSlot {...selected} /> : undefined,
    accessory:
      useTrailingChoice(menu, selected) ?? disclosureAccessory(disclosure),
  });

  return <ListItemFrame {...drawing} />;
}

// Under a row that is not a tile: its separator when its List draws one, and its progress bar when it has one.
function RowDetails({ tile, props, drawing }: PressedProps): ReactNode {
  if (tile) return null;

  return (
    <>
      {rowSeparator(props, drawing)}
      {props.progress ? (
        <ItemProgress progress={props.progress} sidebar={props.sidebar} />
      ) : null}
    </>
  );
}

function rowSeparator(props: DrawingProps, drawing: ItemDrawing): ReactNode {
  const separator = itemSeparator(drawing, hasLeading(props));

  return separator === undefined ? null : (
    <ItemSeparator {...props} separator={separator} />
  );
}

interface PressedProps extends RowParts {
  drawing: ItemDrawing;
}

function PressedContent({ props, drawing, tile }: PressedProps): ReactElement {
  return (
    <>
      <ItemPress
        {...drawingContent(props, tile, drawing.look.valuePlacement)}
      />
      <SelectionTint
        selected={props.selected}
        role={props.role}
        menu={drawing.look.menu}
      />
    </>
  );
}
