import { useEffect } from 'react';
import type { ListLook } from '../../../list-look';
import { useListLook } from '../../../list-look-context';
import {
  useContentRowSelection,
  type ContentSelection,
} from '../list/list-content-selection';
import { ContentSelectionMark } from '../list/list-selection-mark';
import { ChoiceMark } from './list-item-choice-mark';
import type { DrawingProps, RowPressProps } from './list-item-press-props';

function contentMark(
  props: DrawingProps,
  { selectionMark }: ListLook,
): Partial<DrawingProps> {
  if (selectionMark === 'leading')
    return {
      choice: <ContentSelectionMark selected={props.selected} />,
      accessory: undefined,
    };

  if (selectionMark === 'trailing')
    return { accessory: <ChoiceMark {...props} multiple /> };

  return {};
}

// A disabled row is not selectable, whatever element the List's `renderItem` returned around it.
function useLockedRow(
  selection: ContentSelection | null,
  id: string | undefined,
  disabled: boolean | undefined,
): void {
  const lock = selection?.lock;
  const locked = disabled ? id : undefined;

  useEffect(() => lock?.(locked), [lock, locked]);
}

export function useContentItemDrawing(props: DrawingProps): DrawingProps {
  const { selection, id } = useContentRowSelection(props.id);
  const look = useListLook();
  useLockedRow(selection, id, props.disabled);

  if (!selection) return props;

  return selectedDrawing(props, { selection, look, id });
}

interface Selecting {
  selection: ContentSelection;
  look: ListLook;
  id?: string;
}

function selectedDrawing(
  props: DrawingProps,
  { selection, look, id }: Selecting,
): DrawingProps {
  if (!selection.active || id === undefined) return props;

  const selected: DrawingProps = {
    ...props,
    role: 'button',
    selected: selectedContent(props, { selection, look, id }),
  };

  return { ...selected, ...contentMark(selected, look) };
}

// A selected row acts on the whole selection; any other row keeps its own Actions, as Finder's menu on an unselected row does.
export function useContentItemActions(
  props: DrawingProps,
): DrawingProps['actions'] {
  const { selection, id } = useContentRowSelection(props.id);
  const look = useListLook();

  if (!selection) return props.actions;

  return actsOnSelection(selection, id)
    ? selection.actions
    : fallbackActions(props, look);
}

function contentHandlers(
  { selection, look, id }: Required<Selecting>,
  props: DrawingProps,
): RowPressProps {
  return {
    onPress: selection.active
      ? rowSelectionPress(selection, id, props)
      : props.onPress,
    onLongPress: look.longPressSelects
      ? () => selection.longPress(id)
      : props.onLongPress,
  };
}

export function useContentItemPress(props: DrawingProps): RowPressProps {
  const { selection, id } = useContentRowSelection(props.id);
  const look = useListLook();

  if (!selection || id === undefined) return {};

  return contentHandlers({ selection, look, id }, props);
}

export function useSelectedSeparator(id?: string): boolean {
  const content = useContentRowSelection(id);

  return (
    content.id !== undefined &&
    Boolean(content.selection?.coversSeparator(content.id))
  );
}

function actsOnSelection(
  selection: ContentSelection,
  id: string | undefined,
): boolean {
  return selection.active && id !== undefined && selection.isSelected(id);
}

function fallbackActions(
  props: DrawingProps,
  look: ListLook,
): DrawingProps['actions'] {
  return look.selectingDropsRowActions ? undefined : props.actions;
}

function keepsPrimarySelection({ selection, look }: Selecting): boolean {
  return look.primarySelectionStands && selection.selected.length === 0;
}

function selectedContent(
  props: DrawingProps,
  selecting: Required<Selecting>,
): boolean {
  const { selection, id } = selecting;

  if (keepsPrimarySelection(selecting)) return props.selected ?? false;

  return selection.isSelected(id);
}

function rowSelectionPress(
  selection: ContentSelection,
  id: string,
  props: DrawingProps,
): RowPressProps['onPress'] {
  return (event) =>
    selection.press({ id, event, activate: props.onPress, href: props.href });
}
