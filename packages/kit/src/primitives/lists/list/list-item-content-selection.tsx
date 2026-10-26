import { useEffect } from 'react';
import { Platform } from 'react-native';
import { ChoiceMark } from '../list-item/list-item-choice-mark';
import type {
  DrawingProps,
  RowPressProps,
} from '../list-item/list-item-press-props';
import {
  useContentRowSelection,
  type ContentSelection,
} from './list-content-selection';
import { ContentSelectionMark } from './list-selection-mark';

function contentMark(props: DrawingProps): Partial<DrawingProps> {
  if (Platform.OS === 'ios')
    return {
      choice: <ContentSelectionMark selected={props.selected} />,
      accessory: undefined,
    };

  if (Platform.OS === 'android')
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
  useLockedRow(selection, id, props.disabled);

  if (!selection) return props;

  return selectedDrawing(props, selection, id);
}

function selectedDrawing(
  props: DrawingProps,
  selection: ContentSelection,
  id?: string,
): DrawingProps {
  if (!selection.active || id === undefined) return props;

  const selected: DrawingProps = {
    ...props,
    role: 'button',
    selected: selectedContent(props, selection, id),
  };

  return { ...selected, ...contentMark(selected) };
}

export function useContentItemActions(
  props: DrawingProps,
): DrawingProps['actions'] {
  const { selection } = useContentRowSelection(props.id);

  if (!selection) return props.actions;

  return hasSelectedRows(selection)
    ? selection.actions
    : fallbackActions(props);
}

function contentHandlers(
  selection: ContentSelection,
  id: string,
  props: DrawingProps,
): RowPressProps {
  return {
    onPress: selection.active
      ? rowSelectionPress(selection, id, props)
      : props.onPress,
    onLongPress:
      Platform.OS === 'android'
        ? () => selection.longPress(id)
        : props.onLongPress,
  };
}

export function useContentItemPress(props: DrawingProps): RowPressProps {
  const { selection, id } = useContentRowSelection(props.id);

  if (!selection || id === undefined) return {};

  return contentHandlers(selection, id, props);
}

export function useSelectedSeparator(id?: string): boolean {
  const content = useContentRowSelection(id);

  return (
    content.id !== undefined &&
    Boolean(content.selection?.coversSeparator(content.id))
  );
}

function hasSelectedRows(selection: ContentSelection): boolean {
  return selection.active && selection.selected.length > 0;
}

function fallbackActions(props: DrawingProps): DrawingProps['actions'] {
  return Platform.OS === 'android' ? undefined : props.actions;
}

function keepsPrimarySelection(selection: ContentSelection): boolean {
  return Platform.OS === 'web' && selection.selected.length === 0;
}

function selectedContent(
  props: DrawingProps,
  selection: ContentSelection,
  id: string,
): boolean {
  if (keepsPrimarySelection(selection)) return props.selected ?? false;

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
