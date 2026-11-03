import { List, type ListProps } from '@repo/kit/primitives/lists/list';
import { Spinner } from '@repo/kit/primitives/status/spinner';
import type * as React from 'react';
import { useCallback, useMemo, useState } from 'react';
import { View } from 'react-native';
import {
  type ChangesItem,
  type ChangesItems,
  changesItems,
  diffsLoading,
  isDiffItem,
  itemKeeper,
} from '../../view/changes-items';
import type {
  ChangedFile,
  ChangesViewProps,
} from '../../view/changes-view-props';
import { ChangesRow, type RowContext } from './changes-file-rows';
import { type FoldScroll, useFoldScroll } from './use-fold-scroll';
import { useOpenFiles } from './use-open-files';

const changedFilesLabel = 'Changed files';

const loadingMoreLabel = 'Loading more changes';

type FileListProps = ChangesViewProps & { files: readonly ChangedFile[] };

const itemKey = (item: ChangesItem): string => item.key;

// Headers and separators are the list's parts, not rows: they take no row highlight.
const itemType = (item: ChangesItem): string =>
  isDiffItem(item) ? item.kind : 'section';

/*
 * The top edge holds the stuck file header, which a fade would wash out. Plain: each row holds its own 16 inset, the
 * same at every width, so the list adds none.
 */
const identity = {
  appearance: 'plain',
  testID: 'changes-files',
  accessibilityRole: 'list',
  accessibilityLabel: changedFilesLabel,
  keyExtractor: itemKey,
  getItemType: itemType,
  edges: { top: 'never' },
} satisfies Partial<ListProps<ChangesItem>>;

/*
 * One flat list: each file's header sticks to the top while its diff scrolls under it. Every header stays drawn, because
 * the list only makes a drawn row stick, and a header scrolled back to may not be drawn yet (#1895). Files and each
 * opened file's diff arrive a page at a time, as the end of each comes into view; one spinner at the list's end says
 * more is coming.
 */
export function FileList(props: FileListProps): React.JSX.Element {
  const rows = useRows(props);

  return <List<ChangesItem> {...rows} {...identity} {...listEnd(props)} />;
}

interface Rows {
  ref: FoldScroll['ref'];
  items: ChangesItem[];
  stickyHeaderIndices: number[];
  alwaysRender: { keys: string[] };
  extraData: RowContext;
  renderItem: (item: ChangesItem) => React.JSX.Element;
}

// Only what a row reads: a landing diff page changes none of it, so the rows it does not touch stay as drawn.
const useRowContext = ({
  viewed,
  onViewedChange,
  onLoadDiff,
  folded,
  setOpen,
}: RowContext): RowContext =>
  useMemo(
    () => ({ viewed, onViewedChange, onLoadDiff, folded, setOpen }),
    [viewed, onViewedChange, onLoadDiff, folded, setOpen],
  );

const useRenderItem = (context: RowContext): Rows['renderItem'] =>
  useCallback(
    (item) => <ChangesRow item={item} context={context} />,
    [context],
  );

function useRows(props: FileListProps): Rows {
  const open = useOpenFiles(props);
  const { ref, setOpen } = useFoldScroll(open.setOpen);
  const lists = useListItems(props, open.folded);
  const context = useRowContext({ ...props, folded: open.folded, setOpen });

  return {
    ref,
    items: lists.items,
    stickyHeaderIndices: lists.sticky,
    alwaysRender: { keys: lists.headers },
    extraData: context,
    renderItem: useRenderItem(context),
  };
}

function useListItems(
  props: Pick<FileListProps, 'files' | 'diffs'>,
  folded: ReadonlySet<string>,
): ChangesItems {
  const [keep] = useState(itemKeeper);

  return useMemo(() => {
    const lists = changesItems(props.files, folded, props.diffs);

    return { ...lists, items: keep(lists.items) };
  }, [keep, props.files, folded, props.diffs]);
}

type EndProps = Pick<FileListProps, 'moreFiles' | 'onLoadMoreFiles' | 'diffs'>;

const isLoadingMore = (props: EndProps): boolean | undefined =>
  props.moreFiles || diffsLoading(props.diffs);

function listEnd(
  props: EndProps,
): Pick<ListProps<ChangesItem>, 'onEndReached' | 'endContent'> {
  return {
    onEndReached: props.moreFiles ? props.onLoadMoreFiles : undefined,
    endContent: isLoadingMore(props) ? <LoadingMore /> : undefined,
  };
}

function LoadingMore(): React.JSX.Element {
  return (
    <View className="items-center py-4">
      <Spinner accessibilityLabel={loadingMoreLabel} />
    </View>
  );
}
