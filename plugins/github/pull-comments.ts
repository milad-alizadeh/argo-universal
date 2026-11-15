import type { Argo, NamedQuery } from '@argo/plugin-kit';
import { text, valueAt, type Json } from './json';
import { bodyOf, call, type PullTarget } from './pull-reads';

// One review comment on a pull request's diff; `line` is absent once GitHub no longer places it on a line.
export type CommentInfo = {
  id: number;
  path: string;
  line?: number;
  body: string;
};

const invalid = 'GitHub returned invalid review comments.';

// GitHub gives at most this many review comments to a page.
const commentsPerPage = 100;

// Pages Argo reads of one pull request's review comments; more is refused rather than read short.
const pagesRead = 10;

function idOf(comment: Json): number {
  const id = valueAt(comment, ['id']);

  if (typeof id === 'number' && Number.isSafeInteger(id)) return id;

  throw new Error(invalid);
}

const lineOf = (comment: Json): Pick<CommentInfo, 'line'> => {
  const line = valueAt(comment, ['line']);

  return typeof line === 'number' ? { line } : {};
};

const commentOf = (comment: Json): CommentInfo => ({
  id: idOf(comment),
  path: text(comment, invalid, 'path'),
  ...lineOf(comment),
  body: text(comment, invalid, 'body'),
});

function parseComments(body: string): CommentInfo[] {
  const comments: Json = JSON.parse(body);

  if (!Array.isArray(comments)) throw new Error(invalid);

  return comments.map(commentOf);
}

type Fetch = Argo['fetch'];

const pageOf = async (
  fetch: Fetch,
  { repository, number, projectId }: PullTarget,
  page: number,
): Promise<CommentInfo[]> =>
  parseComments(
    await bodyOf(
      fetch,
      call(
        `/repos/${repository}/pulls/${number}/comments?per_page=${commentsPerPage}&page=${page}`,
        projectId,
      ),
      `The review comments of ${repository}#${number}`,
    ),
  );

/*
 * Every review comment of one pull request, oldest first. A page that fails fails the whole read, and a list longer
 * than Argo reads is refused, so a comment is never missed by reading only part of the list.
 */
export async function fetchComments(
  fetch: Fetch,
  target: PullTarget,
): Promise<CommentInfo[]> {
  const comments: CommentInfo[] = [];

  for (let page = 1; page <= pagesRead; page += 1) {
    const read = await pageOf(fetch, target, page);

    comments.push(...read);

    if (read.length < commentsPerPage) return comments;
  }

  throw new Error(
    `More than ${pagesRead * commentsPerPage} review comments is more than Argo reads for one pull request.`,
  );
}

export type CommentsReads = {
  // The review comments of one pull request.
  comments: (target: PullTarget) => NamedQuery<CommentInfo[]>;
};

// A named read like the pull request's own (ADR-0037): a failed read throws, so it is never an empty list.
export const defineCommentsReads = (argo: Argo): CommentsReads => ({
  comments: argo.queries.define(
    'comments',
    (target: PullTarget) => fetchComments(argo.fetch, target),
    { projectOf: ({ projectId }: PullTarget) => projectId },
  ),
});
