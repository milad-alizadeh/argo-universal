import type { Argo } from '@argo/plugin-kit';
import type { AutoMergeInfo, MergeSettings } from './pull-automation';
import type { AutomationReads } from './pull-automation-reads';
import type { CommentInfo, CommentsReads } from './pull-comments';
import type { PullInfo } from './pull-info';
import { known, type Known } from './pull-known';
import type { PullKey } from './pull-store';

type Source = {
  reads: AutomationReads & CommentsReads;
  readState: Argo['queries']['readState'];
};

type OpenReads = {
  autoMerge?: Known<AutoMergeInfo>;
  settings?: Known<MergeSettings>;
  comments?: Known<CommentInfo[]>;
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

// What only an Open pull request has: the only one that can auto-merge or be auto-fixed, so a Merged or Closed one is never asked.
export async function readOpenOnly(
  source: Source,
  link: PullKey,
  pull: PullInfo,
): Promise<OpenReads> {
  if (pull.stage !== 'open') return {};

  const [autoMerge, settings, comments] = await Promise.all([
    readAutoMerge(source, link),
    readSettings(source, link),
    readComments(source, link),
  ]);

  return { autoMerge, settings, comments };
}
