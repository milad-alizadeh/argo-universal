import { type Dispatch, type SetStateAction, useMemo, useState } from 'react';
import type {
  ChangesScope,
  ChangesSource,
  FilesPages,
} from './source/changes-source';
import { serverChanges } from './source/use-server-changes-query';
import {
  type ChangesState,
  compared,
  initialChangesState,
  markedViewed,
  wantedMore,
} from './state/changes-state';
import { diffsByFile, wantedPageKeys } from './state/diff-pages';
import { branchesOf, changesQuery, filesFromPages } from './state/files-pages';
import type { ChangesViewProps } from './view/changes-view-props';

type Actions = Pick<
  ChangesViewProps,
  'onComparisonChange' | 'onViewedChange' | 'onLoadDiff'
>;

const actionsOn = (
  update: Dispatch<SetStateAction<ChangesState>>,
): Actions => ({
  onComparisonChange: (comparison) =>
    update((state) => compared(state, comparison)),
  onViewedChange: (path, viewed) =>
    update((state) => markedViewed(state, path, viewed)),
  onLoadDiff: (path, pages) =>
    update((state) => wantedMore(state, path, pages)),
});

// The callbacks keep one identity, so a row that asks for pages on every draw asks no more often.
function useChangesState(): [ChangesState, Actions] {
  const [state, update] = useState(initialChangesState);
  const actions = useMemo(() => actionsOn(update), [update]);

  return [state, actions];
}

type FilesProps = Pick<
  ChangesViewProps,
  | 'files'
  | 'summary'
  | 'mainBranch'
  | 'loadError'
  | 'moreFiles'
  | 'onLoadMoreFiles'
>;

const filesOf = (files: FilesPages): FilesProps => ({
  ...filesFromPages(files.pages),
  loadError: files.error,
  moreFiles: files.more,
  onLoadMoreFiles: files.loadMore,
});

type LoadedProps = FilesProps & Pick<ChangesViewProps, 'branches' | 'diffs'>;

// What the source has sent for the comparison in force: its branches, its files, and the diff pages wanted.
function useLoaded(
  source: ChangesSource,
  scope: ChangesScope,
  state: ChangesState,
): LoadedProps {
  const branches = source.useBranches(scope);
  const query = changesQuery(scope, state.comparison, branches.data);
  const keys = wantedPageKeys(state.wanted);
  const files = filesOf(source.useFiles(query));
  const diffs = diffsByFile(keys, source.useDiffPages(query, keys));

  source.useRefresh(scope);

  return { ...files, branches: branchesOf(branches), diffs };
}

/*
 * A Session's Changes for the comparison picked: the changed files a page at a time, each opened file's diff a page
 * of lines at a time, and the paths marked Viewed. Picking another comparison starts all of it over. Nothing loads
 * for a scope that is not open, and a new revision reloads them. A Session page is open while it is drawn, because
 * its Workbench card summarises the same reading its Inspector tab shows. The Server is the source unless a story
 * passes one.
 */
export function useChanges(
  scope: ChangesScope,
  source: ChangesSource = serverChanges,
): ChangesViewProps {
  const [state, actions] = useChangesState();

  return {
    ...actions,
    ...useLoaded(source, scope, state),
    comparison: state.comparison,
    viewed: state.viewed,
  };
}
