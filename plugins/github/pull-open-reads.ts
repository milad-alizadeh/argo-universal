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

type Reader<Value> = (source: Source, link: PullKey) => Promise<Known<Value>>;

// What each Open-only read answers with.
type OpenValues = {
  autoMerge: AutoMergeInfo;
  settings: MergeSettings;
  comments: CommentInfo[];
  viewer: string;
};

export type OpenReadKey = keyof OpenValues;

export type OpenReads = { [Key in OpenReadKey]?: Known<OpenValues[Key]> };

type OpenReadTable = { [Key in OpenReadKey]: Reader<OpenValues[Key]> };

// The one place an Open-only read is named: a fifth read is one more entry here.
const openReadTable: OpenReadTable = {
  autoMerge: readAutoMerge,
  settings: readSettings,
  comments: readComments,
  viewer: readViewer,
};

const isOpenReadKey = (key: string): key is OpenReadKey => key in openReadTable;

export const openReadKeys: OpenReadKey[] =
  Object.keys(openReadTable).filter(isOpenReadKey);

// What only an Open pull request has: the only one that can auto-merge or be auto-fixed, so a Merged or Closed one is never asked.
export async function readOpenOnly(
  source: Source,
  link: PullKey,
  pull: PullInfo,
): Promise<OpenReads> {
  if (pull.stage !== 'open') return {};

  const read: OpenReads = {};

  const readKey = async <Key extends OpenReadKey>(key: Key): Promise<void> => {
    Object.assign(read, { [key]: await openReadTable[key](source, link) });
  };

  await Promise.all(openReadKeys.map((key) => readKey(key)));

  return read;
}
