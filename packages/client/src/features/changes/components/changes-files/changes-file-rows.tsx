import { DiffScroll } from '@repo/kit/primitives/content/code';
import { Text } from '@repo/kit/primitives/content/text';
import * as React from 'react';
import { useEffect } from 'react';
import { View } from 'react-native';
import { DiffFileHeader, isDeletedFile } from '#features/feed';
import type { ChangesItem } from '../../view/changes-items';
import type {
  ChangedFile,
  ChangesViewProps,
  FileDiffPages,
} from '../../view/changes-view-props';
import type { OpenFiles } from './use-open-files';

export type RowContext = Pick<
  ChangesViewProps,
  'viewed' | 'onViewedChange' | 'onLoadDiff'
> &
  OpenFiles;

type ItemOf<Kind extends ChangesItem['kind']> = Extract<
  ChangesItem,
  { kind: Kind }
>;

interface RowProps<Kind extends ChangesItem['kind']> {
  item: ItemOf<Kind>;
  context: RowContext;
}

const assertNever = (value: never): never => {
  throw new Error(`Unhandled Changes row: ${JSON.stringify(value)}`);
};

/*
 * Each row is memoised on the item it draws and, for a header, on its own file's open and Viewed marks. A press on one
 * file hands every drawn row a new context, and only that file's header takes in the change.
 */
export function ChangesRow({
  item,
  context,
}: RowProps<ChangesItem['kind']>): React.JSX.Element {
  switch (item.kind) {
    case 'separator':
      return <SeparatorRow />;
    case 'header':
      return <HeaderRow item={item} {...headerState(item, context)} />;
    case 'page':
      return <PageRow item={item} />;
    case 'more':
      return (
        <MoreRow
          path={item.file.path}
          nextPages={item.nextPages}
          onLoadDiff={context.onLoadDiff}
        />
      );
    case 'status':
      return <StatusRow item={item} />;
    default:
      return assertNever(item);
  }
}

const SeparatorRow = React.memo(function SeparatorRow(): React.JSX.Element {
  return <View className="h-px bg-border" />;
});

interface HeaderState {
  open: boolean;
  viewed: boolean;
  setOpen: RowContext['setOpen'];
  onViewedChange: RowContext['onViewedChange'];
}

const headerState = (
  item: ItemOf<'header'>,
  context: RowContext,
): HeaderState => ({
  open: !context.folded.has(item.file.path),
  viewed: context.viewed.includes(item.file.path),
  setOpen: context.setOpen,
  onViewedChange: context.onViewedChange,
});

// Marking a file Viewed folds it; clearing the mark opens it again, as on GitHub.
const HeaderRow = React.memo(function HeaderRow({
  item,
  open,
  viewed,
  setOpen,
  onViewedChange,
}: HeaderState & { item: ItemOf<'header'> }): React.JSX.Element {
  const { path } = item.file;

  return (
    <DiffFileHeader
      file={item.file}
      open={open}
      onOpenChange={(next) => setOpen(path, next)}
      viewed={viewed}
      onViewedChange={(next) => {
        setOpen(path, !next);
        onViewedChange(path, next);
      }}
    />
  );
});

const PageRow = React.memo(function PageRow({
  item,
}: Pick<RowProps<'page'>, 'item'>): React.JSX.Element {
  return (
    <View className="bg-card medium:bg-content">
      <DiffScroll hunks={item.hunks} inline={false} path={item.file.path} />
    </View>
  );
});

interface MoreRowProps {
  path: string;
  nextPages: number;
  onLoadDiff: RowContext['onLoadDiff'];
}

// Holds a place at the end of the pages so far, so the next is asked for only once the list draws it near the reader.
const MoreRow = React.memo(function MoreRow({
  path,
  nextPages,
  onLoadDiff,
}: MoreRowProps): React.JSX.Element {
  useEffect(() => {
    onLoadDiff(path, nextPages);
  }, [path, onLoadDiff, nextPages]);

  return <View className="h-px bg-card medium:bg-content" />;
});

function statusText(text: string, tone: 'danger' | 'muted'): React.JSX.Element {
  return (
    <Text role="secondary" tone={tone}>
      {text}
    </Text>
  );
}

const noLinesText = (file: ChangedFile): string =>
  file.binary ? "Binary file, can't be previewed" : 'No lines to show';

// Git counts every line of a deleted text file as removed, so one with none removed was empty.
function deletedFileText(file: ChangedFile): string {
  if (file.binary) return 'Binary file deleted';

  return file.removed === 0 ? 'Empty file deleted' : noLinesText(file);
}

const emptyDiffText = (file: ChangedFile): string =>
  isDeletedFile(file) ? deletedFileText(file) : noLinesText(file);

// Drawn under an opened file whose load failed or that has no lines to show.
const StatusRow = React.memo(function StatusRow({
  item,
}: Pick<RowProps<'status'>, 'item'>): React.JSX.Element {
  return (
    <View className="items-center bg-card px-4 py-3 medium:bg-content">
      <StatusContent file={item.file} diff={item.diff} />
    </View>
  );
});

function StatusContent(props: {
  file: ChangedFile;
  diff: FileDiffPages;
}): React.JSX.Element {
  if (props.diff.loadError !== undefined)
    return statusText(props.diff.loadError, 'danger');

  return statusText(emptyDiffText(props.file), 'muted');
}
