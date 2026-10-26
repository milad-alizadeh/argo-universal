import type { ComponentProps, ReactNode } from 'react';
import { View } from 'react-native';
import { useDeclaredActions } from '#primitives/actions/action';
import { useListAnchor, ListJump } from './list-anchor';
import {
  ContentSelectionContext,
  useContentSelection,
  type ContentSelection,
} from './list-content-selection';
import { useListLoading } from './list-loading';
import type { ListProps } from './list-props';
import { ListRefreshShortcut } from './list-refresh';
import { useListSearch } from './list-search';
import { useSelectionActions } from './list-selection-actions';
import { useSelectionBack } from './list-selection-back';
import { selectionKeys } from './list-selection-keys';
import { SelectionToolbar } from './list-selection-toolbar';

interface FrameProps {
  selection: ContentSelection | null;
  search: ReactNode;
  jump: ReactNode;
  children: ReactNode;
}

function BehaviourFrame(props: FrameProps): ReactNode {
  useSelectionBack(props.selection);
  const actions = useSelectionActions(props.selection);
  const declared = useDeclaredActions(actions, true);
  const toolbar = { selection: props.selection, groups: declared.groups };

  return <BehaviourDrawing {...props} id={declared.id} toolbar={toolbar} />;
}

interface FrameDrawing extends FrameProps {
  id: string;
  toolbar: Pick<
    ComponentProps<typeof SelectionToolbar>,
    'selection' | 'groups'
  >;
}

function BehaviourDrawing(props: FrameDrawing): ReactNode {
  return (
    <View
      nativeID={props.id}
      className="relative min-h-0 flex-1"
      onKeyDown={selectionKeys(props.selection)}
    >
      {props.search}
      <SelectionToolbar {...props.toolbar} />
      {props.children}
      <SelectionToolbar {...props.toolbar} bottom />
      {props.jump}
    </View>
  );
}

interface BehaviourProps<Item> {
  list: ListProps<Item>;
  render: (props: ListProps<Item>) => ReactNode;
}

function drawJump<Item>(
  list: ListProps<Item>,
  anchor: ReturnType<typeof useListAnchor<Item>>,
): ReactNode {
  return list.anchor === 'end' ? (
    <ListJump key={anchor.mounts} list={anchor.list} newest={anchor.newest} />
  ) : null;
}

function frameRows(
  frame: Omit<FrameProps, 'children'>,
  rows: ReactNode,
): ReactNode {
  const framed = [frame.selection, frame.search, frame.jump].some(Boolean);

  return framed ? <BehaviourFrame {...frame}>{rows}</BehaviourFrame> : rows;
}

export function ListBehaviours<Item>({
  list,
  render,
}: BehaviourProps<Item>): ReactNode {
  const search = useListSearch(list);
  const anchor = useListAnchor(useListLoading(search.props));
  const selection = useContentSelection(search.props);

  const frame = createFrame(search.search, anchor, selection);

  const rows = frameRows(frame, render(anchor.props));

  return (
    <ContentSelectionContext value={selection}>
      <ListRefreshShortcut refresh={list.onRefresh}>{rows}</ListRefreshShortcut>
    </ContentSelectionContext>
  );
}

function createFrame<Item>(
  search: ReactNode,
  anchor: ReturnType<typeof useListAnchor<Item>>,
  selection: ContentSelection | null,
): Omit<FrameProps, 'children'> {
  return { selection, search, jump: drawJump(anchor.props, anchor) };
}
