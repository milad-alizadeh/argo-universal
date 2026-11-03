import { useContext, type ReactElement, type ReactNode } from 'react';
import { View } from 'react-native';
import { ContextActions } from '#primitives/actions/action';
import {
  useInMovingList,
  useListItemGroup,
  useMoveActions,
} from '#primitives/lists/list';
import { useSkeletonLoading } from '#primitives/status/skeleton';
import { ListTileContext, RowPositionContext } from '../../../list-context';
import { useListLook } from '../../../list-look-context';
import { nestedRows, nestsChildren } from '../../../list-tree';
import { drawsMovePicker } from '../list/list-move-picker-drawing';
import {
  drawsPlaceholderRows,
  type PlaceholderRowProps,
} from '../list/list-placeholder';
import {
  useContentItemDrawing,
  useContentItemActions,
} from './list-item-content-selection';
import { drawingContent } from './list-item-drawing-content';
import { RowMovePicker } from './list-item-move-picker';
import { NestingItem } from './list-item-nesting';
import { ItemPress, rowMenu, type DrawingProps } from './list-item-press';
import type { ListItemProps } from './list-item-props';
import {
  rowDetails,
  useItemDrawing,
  type RowParts,
} from './list-item-row-details';
import {
  disclosureAccessory,
  useItemSelection,
  useTrailingChoice,
  ChoiceSlot,
  SelectionTint,
} from './list-item-selection';
import { itemSurface } from './list-item-styles';

const tileSurface = 'relative overflow-hidden rounded-3xl bg-card';

export function ListItemFrame(props: DrawingProps): ReactElement {
  return itemFrame(props, useFrame(props));
}

// What a row's frame holds: its group's position and footer, its actions, and its moves.
interface Frame {
  group: ReturnType<typeof useListItemGroup>;
  actions: ReturnType<typeof useContentItemActions>;
  moves: ReturnType<typeof useMoveActions>;
}

function useFrame(props: DrawingProps): Frame {
  return {
    group: useListItemGroup(props.description),
    actions: useContentItemActions(props),
    moves: useMoveActions(props.id),
  };
}

const itemFrame = (
  props: DrawingProps,
  { group, actions, moves }: Frame,
): ReactElement => (
  <ContextActions actions={actions} builtIn={moves} menu={rowMenu(props)}>
    <>
      <RowPositionContext value={group.context}>
        <ItemSurface {...props} />
      </RowPositionContext>
      {group.footer}
    </>
  </ContextActions>
);

// A row's props, how it draws, whether it is a tile, and whether its List moves it.
interface SurfaceParts extends RowParts {
  movable: boolean;
}

// A chosen row shows its check only, with no selected fill; a selected row without a check keeps its tint.
function ItemSurface(props: DrawingProps): ReactElement {
  const drawing = useItemDrawing(props);
  const tile = useContext(ListTileContext) !== null;
  // A row a Skeleton holds is a placeholder whose title is a width, so the row hides its own label. Both Skeletons hide everything they hold as well; this says it on the row itself, which is where the web story can see it. Skeleton.Ignore sets the context false.
  const loading = useSkeletonLoading();
  const movable = useInMovingList();

  return (
    <View
      className={tile ? tileSurface : itemSurface(drawing, props)}
      aria-hidden={loading || undefined}
    >
      {surfaceContent({ props, drawing, tile, movable })}
    </View>
  );
}

// What the surface holds, each part only when the row has it, so a plain row draws no empty components.
const surfaceContent = (parts: SurfaceParts): ReactNode => (
  <>
    {pressedContent(parts)}
    {rowDetails(parts)}
    {parts.movable ? (
      <RowMovePicker id={parts.props.id} Row={ListItem} />
    ) : null}
  </>
);

export function ListItem({ children, ...props }: ListItemProps): ReactElement {
  const rows = nestedRows(children);
  const row = <ChoosingItem {...props} />;

  return rows.length === 0 ? row : <NestingItem row={row} rows={rows} />;
}

// A List lifts child ListItems to rows of their own; it hands them on to this row's tree lane instead.
nestsChildren(ListItem);

// A native grouped List's FieldGroup rows open the same Move to… picker, its places listed as ListItems.
drawsMovePicker(({ id }) => <RowMovePicker id={id} Row={ListItem} />);

// A List with no rows of its own stands in for itself with rows of this shape.
drawsPlaceholderRows((props: PlaceholderRowProps) => <ListItem {...props} />);

// A menu row's check leads the row; elsewhere only a choosing List draws it, trailing. It draws the row's frame itself, so a row is no deeper than its frame.
function ChoosingItem(props: ListItemProps): ReactElement {
  const drawing = useChoosing(props);

  return itemFrame(drawing, useFrame(drawing));
}

function useChoosing({ disclosure, ...props }: ListItemProps): DrawingProps {
  const selected = useItemSelection(props);
  const { menu } = useListLook();

  return useContentItemDrawing({
    ...selected,
    choice: menu ? <ChoiceSlot {...selected} /> : undefined,
    accessory:
      useTrailingChoice(menu, selected) ?? disclosureAccessory(disclosure),
  });
}

// The row's press and, for a selected row, its tint over it.
const pressedContent = ({ props, drawing, tile }: RowParts): ReactNode => (
  <>
    <ItemPress {...drawingContent(props, tile, drawing.look.valuePlacement)} />
    {props.selected ? selectionTint(props, drawing.look.menu) : null}
  </>
);

const selectionTint = (props: DrawingProps, menu: boolean): ReactNode => (
  <SelectionTint selected={props.selected} role={props.role} menu={menu} />
);
