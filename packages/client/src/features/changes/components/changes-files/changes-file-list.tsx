import { List, type ListProps } from '@repo/kit/primitives/lists/list';
import { Spinner } from '@repo/kit/primitives/status/spinner';
import type * as React from 'react';
import { useMemo } from 'react';
import { View } from 'react-native';
import {
  type ChangesItem,
  type ChangesItems,
  changesItems,
  diffsLoading,
  isDiffItem,
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
 * One flat list: each file's header sticks to the top while its diff scrolls under it. Files and each opened file's
 * diff arrive a page at a time, as the end of each comes into view; one spinner at the list's end says more is coming.
 */
export function FileList(props: FileListProps): React.JSX.Element {
  return (
    <List<ChangesItem> {...useRows(props)} {...identity} {...more(props)} />
  );
}

interface Rows {
  ref: FoldScroll['ref'];
  items: ChangesItem[];
  stickyHeaderIndices: number[];
  extraData: RowContext;
  renderItem: (item: ChangesItem) => React.JSX.Element;
}

function useRows(props: FileListProps): Rows {
  const open = useOpenFiles();
  const { ref, setOpen } = useFoldScroll(open.setOpen);
  const lists = useListItems(props, open.folded);
  const context: RowContext = { ...props, folded: open.folded, setOpen };

  return {
    ref,
    items: lists.items,
    stickyHeaderIndices: lists.sticky,
    extraData: context,
    renderItem: (item) => <ChangesRow item={item} context={context} />,
  };
}

function useListItems(
  props: FileListProps,
  folded: ReadonlySet<string>,
): ChangesItems {
  return useMemo(
    () => changesItems(props.files, folded, props.diffs),
    [props.files, folded, props.diffs],
  );
}

const loadingMore = (props: FileListProps): boolean | undefined =>
  props.moreFiles || diffsLoading(props.diffs);

function more(
  props: FileListProps,
): Pick<ListProps<ChangesItem>, 'onEndReached' | 'endContent'> {
  return {
    onEndReached: props.moreFiles ? props.onLoadMoreFiles : undefined,
    endContent: loadingMore(props) ? <LoadingMore /> : undefined,
  };
}

function LoadingMore(): React.JSX.Element {
  return (
    <View className="items-center py-4">
      <Spinner accessibilityLabel={loadingMoreLabel} />
    </View>
  );
}
