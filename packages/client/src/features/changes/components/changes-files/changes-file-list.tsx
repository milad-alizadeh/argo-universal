import { List, type ListProps } from '@repo/kit/primitives/lists/list';
import { Spinner } from '@repo/kit/primitives/status/spinner';
import type * as React from 'react';
import { useMemo } from 'react';
import { View } from 'react-native';
import {
  type ChangesItem,
  type ChangesItems,
  changesItems,
} from '../../view/changes-items';
import type {
  ChangedFile,
  ChangesViewProps,
} from '../../view/changes-view-props';
import { ChangesRow, type RowContext } from './changes-file-rows';
import { useOpenFiles } from './use-open-files';

export const loadingMoreFilesLabel = 'Loading more files';

type FileListProps = ChangesViewProps & { files: readonly ChangedFile[] };

const itemKey = (item: ChangesItem): string => item.key;

// Headers and separators are the list's parts, not rows: they take no row highlight.
const itemType = (item: ChangesItem): string =>
  item.kind === 'page' || item.kind === 'status' ? item.kind : 'section';

// The top edge holds the stuck file header, which a fade would wash out.
const identity = {
  testID: 'changes-files',
  keyExtractor: itemKey,
  getItemType: itemType,
  edges: { top: 'never' },
} satisfies Partial<ListProps<ChangesItem>>;

/*
 * One flat list: each file's header sticks to the top while its diff scrolls under it. Files and each opened file's
 * diff arrive a page at a time, as the end of each comes into view.
 */
export function FileList(props: FileListProps): React.JSX.Element {
  const { open, setOpen } = useOpenFiles(props.comparison);
  const lists = useListItems(props, open);
  const context: RowContext = { ...props, open, setOpen };

  return (
    <List<ChangesItem>
      items={lists.items}
      stickyHeaderIndices={lists.sticky}
      {...identity}
      extraData={context}
      renderItem={(item) => <ChangesRow item={item} context={context} />}
      {...moreFiles(props)}
    />
  );
}

function useListItems(
  props: FileListProps,
  open: ReadonlySet<string>,
): ChangesItems {
  return useMemo(
    () => changesItems(props.files, open, props.diffs),
    [props.files, open, props.diffs],
  );
}

function moreFiles(
  props: FileListProps,
): Pick<ListProps<ChangesItem>, 'onEndReached' | 'endContent'> {
  if (!props.moreFiles) return {};

  return { onEndReached: props.onLoadMoreFiles, endContent: <MoreFiles /> };
}

function MoreFiles(): React.JSX.Element {
  return (
    <View className="items-center py-4">
      <Spinner accessibilityLabel={loadingMoreFilesLabel} />
    </View>
  );
}
