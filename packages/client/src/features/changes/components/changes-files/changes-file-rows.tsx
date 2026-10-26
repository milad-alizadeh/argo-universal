import { DiffScroll } from '@repo/kit/primitives/content/code';
import { Text } from '@repo/kit/primitives/content/text';
import { Spinner } from '@repo/kit/primitives/status/spinner';
import type * as React from 'react';
import { useEffect } from 'react';
import { View } from 'react-native';
import { DiffFileHeader } from '#features/feed';
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

interface RowProps<Kind extends ChangesItem['kind']> {
  item: Extract<ChangesItem, { kind: Kind }>;
  context: RowContext;
}

export const loadingDiffLabel = (path: string): string =>
  `Loading the diff for ${path}`;

type AnyRowProps = { item: ChangesItem; context: RowContext };

export function ChangesRow({ item, context }: AnyRowProps): React.JSX.Element {
  if (item.kind === 'header')
    return <HeaderRow item={item} context={context} />;

  if (item.kind === 'separator') return <SeparatorRow />;

  return <DiffRow item={item} context={context} />;
}

function DiffRow({
  item,
  context,
}: RowProps<'page' | 'status'>): React.JSX.Element {
  if (item.kind === 'page') return <PageRow item={item} context={context} />;

  return <StatusRow item={item} context={context} />;
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
      open={context.open.has(path)}
      onOpenChange={(open) => context.setOpen(path, open)}
      viewed={context.viewed.includes(path)}
      onViewedChange={(viewed) => {
        context.setOpen(path, !viewed);
        context.onViewedChange(path, viewed);
      }}
    />
  );
}

function PageRow({ item }: RowProps<'page'>): React.JSX.Element {
  return (
    <View className="bg-card medium:bg-content">
      <DiffScroll hunks={item.hunks} inline={false} path={item.file.path} />
    </View>
  );
}

const idle = (diff: FileDiffPages): boolean =>
  !diff.loading && diff.loadError === undefined;

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

type Status =
  | { kind: 'failed'; message: string }
  | { kind: 'empty' }
  | { kind: 'loading' };

const settledStatus = (diff: FileDiffPages): Status =>
  idle(diff) && !diff.more ? { kind: 'empty' } : { kind: 'loading' };

function statusOf(diff: FileDiffPages | undefined): Status {
  if (!diff) return { kind: 'loading' };

  if (diff.loadError !== undefined)
    return { kind: 'failed', message: diff.loadError };

  return settledStatus(diff);
}

function StatusContent(props: {
  file: ChangedFile;
  diff?: FileDiffPages;
}): React.JSX.Element {
  const status = statusOf(props.diff);

  if (status.kind === 'failed')
    return <Text tone="danger">{status.message}</Text>;

  if (status.kind === 'empty')
    return <Text tone="muted">No lines to show</Text>;

  return <Spinner accessibilityLabel={loadingDiffLabel(props.file.path)} />;
}
