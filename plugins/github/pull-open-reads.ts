import type { Argo } from '@argo/plugin-kit';
import type { AutoMergeInfo, MergeSettings } from './pull-automation';
import type { AutomationReads } from './pull-automation-reads';
import type { CommentInfo, CommentsReads } from './pull-comments';
import type { PullInfo } from './pull-info';
import { known, type Known } from './pull-known';
import type { PullKey } from './pull-store';
import type { ViewerReads } from './pull-viewer';

type Source = {
  reads: AutomationReads & CommentsReads & ViewerReads;
  readState: Argo['queries']['readState'];
};

const readAutoMerge = (
  { readState, reads }: Source,
  { projectId, repository, number }: PullKey,
): Promise<Known<AutoMergeInfo>> =>
  known(() =>
    readState(reads.autoMerge({ projectId, repository, number }), {
      projectId,
    }),
  );

const readSettings = (
  { readState, reads }: Source,
  { projectId, repository }: PullKey,
): Promise<Known<MergeSettings>> =>
  known(() =>
    readState(reads.mergeSettings({ projectId, repository }), { projectId }),
  );

const readComments = (
  { readState, reads }: Source,
  { projectId, repository, number }: PullKey,
): Promise<Known<CommentInfo[]>> =>
  known(() =>
    readState(reads.comments({ projectId, repository, number }), {
      projectId,
    }),
  );

const readViewer = (
  { readState, reads }: Source,
  { projectId }: PullKey,
): Promise<Known<string>> =>
  known(() => readState(reads.viewer({ projectId }), { projectId }));

/*
 * What only an Open pull request has, and why: its auto-merge and its repository's merge settings, since only an Open one
 * can auto-merge; its review comments, which Auto-fix prompts about; and the signed-in account, so Auto-fix can tell
 * whether it opened the pull request. Each answer's type comes from its read, so the compiler checks every name.
 */
export type OpenReads = {
  autoMerge?: Awaited<ReturnType<typeof readAutoMerge>>;
  settings?: Awaited<ReturnType<typeof readSettings>>;
  comments?: Awaited<ReturnType<typeof readComments>>;
  viewer?: Awaited<ReturnType<typeof readViewer>>;
};

export type OpenReadKey = keyof OpenReads;

export const openReadKeys = [
  'autoMerge',
  'settings',
  'comments',
  'viewer',
] as const satisfies readonly OpenReadKey[];

// A name left out of the list above fails to type-check here.
export const listsEveryName: Exclude<
  OpenReadKey,
  (typeof openReadKeys)[number]
> extends never
  ? true
  : false = true;

// A Merged or Closed pull request is never asked.
export async function readOpenOnly(
  source: Source,
  link: PullKey,
  pull: PullInfo,
): Promise<OpenReads> {
  if (pull.stage !== 'open') return {};

  const [autoMerge, settings, comments, viewer] = await Promise.all([
    readAutoMerge(source, link),
    readSettings(source, link),
    readComments(source, link),
    readViewer(source, link),
  ]);

  return { autoMerge, settings, comments, viewer };
}
