import type { LinkRead } from './pull-changes';
import type { CheckInfo } from './pull-checks';
import type { CommentInfo } from './pull-comments';
import type { FixFacts } from './pull-fix-prompts';
import type { PullInfo } from './pull-info';
import type { Known } from './pull-known';

export const failedOf = (checks: readonly CheckInfo[]): string[] =>
  checks.flatMap(({ name, state }) => (state === 'failed' ? [name] : []));

export const runningOf = (checks: readonly CheckInfo[]): boolean =>
  checks.some(({ state }) => state === 'running');

// A read that failed, or is only last known, is not acted on.
export const dataOf = <Value>({
  data,
  failure,
}: Known<Value>): Value | undefined => (failure ? undefined : data);

const checksIn = (checks?: Known<CheckInfo[]>): CheckInfo[] | undefined =>
  checks && dataOf(checks);

const commentsIn = (
  comments?: Known<CommentInfo[]>,
): CommentInfo[] | undefined => comments && dataOf(comments);

const withComments = (
  pull: PullInfo,
  { checks }: LinkRead,
  comments: CommentInfo[],
): FixFacts | undefined => {
  const reported = checksIn(checks);

  return (
    reported && {
      pull,
      failed: failedOf(reported),
      running: runningOf(reported),
      comments,
    }
  );
};

const withRead = (pull: PullInfo, read: LinkRead): FixFacts | undefined => {
  const comments = commentsIn(read.comments);

  return comments && withComments(pull, read, comments);
};

/*
 * What is known now of one open pull request, its head's Checks and its review comments. A read that failed leaves
 * nothing to act on: a failed comments read is never taken for no comments, and holds back the Checks' Prompt too. A
 * pull request that is not open has nothing to fix.
 */
export const factsOf = (
  pull: PullInfo,
  read: LinkRead,
): FixFacts | undefined =>
  pull.stage === 'open' ? withRead(pull, read) : undefined;
