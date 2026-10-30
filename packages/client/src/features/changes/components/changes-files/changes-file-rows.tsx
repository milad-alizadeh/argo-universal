import { DiffScroll } from '@repo/kit/primitives/content/code';
import { Text } from '@repo/kit/primitives/content/text';
import { Spinner } from '@repo/kit/primitives/status/spinner';
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
import { idle, settled } from '../../view/diff-pages-state';
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

const loadingDiffLabel = (path: string): string =>
  `Loading the diff for ${path}`;

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
}: RowProps<'page' | 'status'>): React.JSX.Element {
  switch (item.kind) {
    case 'page':
      return <PageRow item={item} />;
    case 'status':
      return <StatusRow item={item} context={context} />;
    default:
      return assertNever(item);
  }
}

function SeparatorRow(): React.JSX.Element {
  return <View className="h-px bg-border" />;
}

// Marking a file Viewed folds it; clearing the mark opens it again.
function HeaderRow({ item, context }: RowProps<'header'>): React.JSX.Element {
  const { path } = item.file;

  return (
    <DiffFileHeader
      file={item.file}
      open={!context.folded.has(path)}
      onOpenChange={(open) => context.setOpen(path, open)}
      viewed={context.viewed.includes(path)}
      onViewedChange={(viewed) => {
        context.setOpen(path, !viewed);
        context.onViewedChange(path, viewed);
      }}
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

const morePages = (diff: FileDiffPages): number | undefined =>
  idle(diff) && diff.more ? diff.pages.length + 1 : undefined;

// The next page a file's diff wants, once its status row is drawn; none while one loads or after a failure.
const wantedPages = (diff: FileDiffPages | undefined): number | undefined =>
  diff ? morePages(diff) : 1;

function useNextPage(
  file: ChangedFile,
  context: RowContext,
  diff?: FileDiffPages,
): void {
  const pages = wantedPages(diff);
  const { onLoadDiff } = context;

  useEffect(() => {
    if (pages !== undefined) onLoadDiff(file.path, pages);
  }, [file.path, onLoadDiff, pages]);
}

/*
 * Drawn under an opened file while its diff has more to say. The list draws it only near the viewport, so a long diff
 * asks for its next page as its end scrolls into view.
 */
function StatusRow({ item, context }: RowProps<'status'>): React.JSX.Element {
  useNextPage(item.file, context, item.diff);

  return (
    <View className="items-center bg-card px-4 py-3 medium:bg-content">
      <StatusContent file={item.file} diff={item.diff} />
    </View>
  );
}

const loadErrorOf = (diff: FileDiffPages | undefined): string | undefined =>
  diff?.loadError;

const hasNothingToShow = (diff: FileDiffPages | undefined): boolean =>
  diff !== undefined && settled(diff);

function statusText(text: string, tone: 'danger' | 'muted'): React.JSX.Element {
  return (
    <Text role="secondary" tone={tone}>
      {text}
    </Text>
  );
}

const emptyDiffText = (file: ChangedFile): string =>
  file.binary ? "Binary file, can't be previewed" : 'No lines to show';

function StatusContent(props: {
  file: ChangedFile;
  diff?: FileDiffPages;
}): React.JSX.Element {
  const loadError = loadErrorOf(props.diff);

  if (loadError !== undefined) return statusText(loadError, 'danger');

  if (hasNothingToShow(props.diff))
    return statusText(emptyDiffText(props.file), 'muted');

  return <Spinner accessibilityLabel={loadingDiffLabel(props.file.path)} />;
}
