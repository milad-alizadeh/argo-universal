import { DiffScroll } from '@repo/kit/primitives/content/code';
import { Text } from '@repo/kit/primitives/content/text';
import type * as React from 'react';
import { useEffect } from 'react';
import { View } from 'react-native';
import { DiffFileHeader } from '#features/feed';
import { type ChangesItem, isDiffItem } from '../../view/changes-items';
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

export function ChangesRow(
  props: RowProps<ChangesItem['kind']>,
): React.JSX.Element {
  const { item, context } = props;

  return isDiffItem(item) ? (
    <DiffRow item={item} context={context} />
  ) : (
    <FileRow item={item} context={context} />
  );
}

function FileRow({
  item,
  context,
}: RowProps<'separator' | 'header'>): React.JSX.Element {
  switch (item.kind) {
    case 'separator':
      return <SeparatorRow />;
    case 'header':
      return <HeaderRow item={item} context={context} />;
    default:
      return assertNever(item);
  }
}

function DiffRow({
  item,
  context,
}: RowProps<'page' | 'more' | 'status'>): React.JSX.Element {
  return item.kind === 'status' ? (
    <StatusRow item={item} />
  ) : (
    <LinesRow item={item} context={context} />
  );
}

function LinesRow({
  item,
  context,
}: RowProps<'page' | 'more'>): React.JSX.Element {
  return item.kind === 'page' ? (
    <PageRow item={item} />
  ) : (
    <MoreRow item={item} context={context} />
  );
}

function SeparatorRow(): React.JSX.Element {
  return <View className="h-px bg-border" />;
}

// Marking a file Viewed folds it; clearing the mark opens it again.
const viewedChange =
  (path: string, context: Pick<RowContext, 'setOpen' | 'onViewedChange'>) =>
  (viewed: boolean): void => {
    context.setOpen(path, !viewed);
    context.onViewedChange(path, viewed);
  };

function HeaderRow({ item, context }: RowProps<'header'>): React.JSX.Element {
  const { path } = item.file;

  return (
    <DiffFileHeader
      file={item.file}
      open={!context.folded.has(path)}
      onOpenChange={(open) => context.setOpen(path, open)}
      viewed={context.viewed.includes(path)}
      onViewedChange={viewedChange(path, context)}
    />
  );
}

function PageRow({ item }: Pick<RowProps<'page'>, 'item'>): React.JSX.Element {
  return (
    <View className="bg-card medium:bg-content">
      <DiffScroll hunks={item.hunks} inline={false} path={item.file.path} />
    </View>
  );
}

// Holds a place at the end of the pages so far, so the next is asked for only once the list draws it near the reader.
function MoreRow({ item, context }: RowProps<'more'>): React.JSX.Element {
  const { file, nextPages } = item;
  const { onLoadDiff } = context;

  useEffect(() => {
    onLoadDiff(file.path, nextPages);
  }, [file.path, onLoadDiff, nextPages]);

  return <View className="h-px bg-card medium:bg-content" />;
}

function statusText(text: string, tone: 'danger' | 'muted'): React.JSX.Element {
  return (
    <Text role="secondary" tone={tone}>
      {text}
    </Text>
  );
}

const emptyDiffText = (file: ChangedFile): string =>
  file.binary ? "Binary file, can't be previewed" : 'No lines to show';

// Drawn under an opened file whose load failed or that has no lines to show.
function StatusRow({
  item,
}: Pick<RowProps<'status'>, 'item'>): React.JSX.Element {
  return (
    <View className="items-center bg-card px-4 py-3 medium:bg-content">
      <StatusContent file={item.file} diff={item.diff} />
    </View>
  );
}

function StatusContent(props: {
  file: ChangedFile;
  diff: FileDiffPages;
}): React.JSX.Element {
  if (props.diff.loadError !== undefined)
    return statusText(props.diff.loadError, 'danger');

  return statusText(emptyDiffText(props.file), 'muted');
}
