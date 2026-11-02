import {
  type Dispatch,
  type SetStateAction,
  useEffect,
  useMemo,
  useState,
} from 'react';
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
  refreshed,
  setOpen,
  wantedMore,
} from './state/changes-state';
import { diffsByFile, diffsKeeper, wantedPageKeys } from './state/diff-pages';
import { branchesOf, changesQuery, filesFromPages } from './state/files-pages';
import type { ChangedFile, ChangesViewProps } from './view/changes-view-props';

type Actions = Pick<
  ChangesViewProps,
  'onComparisonChange' | 'onViewedChange' | 'onOpenChange' | 'onLoadDiff'
>;

type Update = Dispatch<SetStateAction<ChangesState>>;

const actionsOn = (update: Update): Actions => ({
  onComparisonChange: (comparison) =>
    update((state) => compared(state, comparison)),
  onViewedChange: (path, viewed) =>
    update((state) => markedViewed(state, path, viewed)),
  onOpenChange: (path, open) => update((state) => setOpen(state, path, open)),
  onLoadDiff: (path, pages) =>
    update((state) => wantedMore(state, path, pages)),
});

// What a Session's Changes keep; the Session page holds it beyond the page, a story lets it go with the list.
export type HeldChanges = [ChangesState, Update];

// The callbacks keep one identity, so a row that asks for pages on every draw asks no more often.
function useChangesState(
  held: HeldChanges | undefined,
): [ChangesState, Update, Actions] {
  const own = useState(initialChangesState);
  const [state, update] = held ?? own;
  const actions = useMemo(() => actionsOn(update), [update]);

  return [state, update, actions];
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

// The files keep one identity until a page changes, however often the source's hook returns.
function useFilesOf(files: FilesPages): FilesProps {
  const { pages } = files;
  const fromPages = useMemo(() => filesFromPages(pages), [pages]);

  return {
    ...fromPages,
    loadError: files.error,
    moreFiles: files.more,
    onLoadMoreFiles: files.loadMore,
  };
}

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
  const [keepDiffs] = useState(diffsKeeper);
  const files = useFilesOf(source.useFiles(query));
  const diffs = keepDiffs(diffsByFile(keys, source.useDiffPages(query, keys)));

  source.useRefresh(scope);

  return { ...files, branches: branchesOf(branches), diffs };
}

// The list is the same array until a mark changes, so rows that read it draw only when it does.
function useShown(
  state: ChangesState,
): Pick<ChangesViewProps, 'comparison' | 'viewed' | 'folded'> {
  const viewed = useMemo(() => Object.keys(state.viewed), [state.viewed]);

  return { comparison: state.comparison, viewed, folded: state.folded };
}

// Marks learn the file as it is when made; one the Checkout has changed since is no longer Viewed, and opens again.
function useRefreshedMarks(
  files: readonly ChangedFile[] | undefined,
  { viewed }: ChangesState,
  update: Update,
): void {
  useEffect(() => {
    if (files) update((last) => refreshed(last, files));
  }, [files, viewed, update]);
}

/*
 * A Session's Changes for the comparison picked (kept with the Session when `held`): the changed files a page at a time, each opened file's diff a page
 * of lines at a time, and the paths marked Viewed. Picking another comparison starts all of it over. Nothing loads
 * for a scope that is not open, and a new revision reloads them. A Session page is open while it is drawn, because
 * its Workbench card summarises the same reading its Inspector tab shows. The Server is the source unless a story
 * passes one.
 */
export function useChanges(
  scope: ChangesScope,
  source: ChangesSource = serverChanges,
  held?: HeldChanges,
): ChangesViewProps {
  const [state, update, actions] = useChangesState(held);
  const loaded = useLoaded(source, scope, state);

  useRefreshedMarks(loaded.files, state, update);

  return { ...actions, ...loaded, ...useShown(state) };
}
