import type { CommentInfo } from './pull-comments';
import { checkKey, commentKey, conflictKey } from './pull-fix-rows';
import type { PullInfo } from './pull-info';
import { shortHead } from './pull-reads';

// One thing on a pull request Auto-fix prompts about once: its key in the events table, and the Prompt it sends.
export type FixEvent = { key: string; text: string };

// What one read of a pull request says Auto-fix may prompt about.
export type FixFacts = {
  pull: PullInfo;
  failed: readonly string[];
  comments: readonly CommentInfo[];
};

const nameOf = ({ repository, number }: PullInfo): string =>
  `${repository}#${number}`;

const checkPrompt = (pull: PullInfo, check: string): string =>
  `Check \`${check}\` failed on ${nameOf(pull)} at ${pull.head.slice(0, shortHead)}. Read it, fix it, and push.`;

const conflictPrompt = (pull: PullInfo): string =>
  `${nameOf(pull)} conflicts with ${pull.base}. Rebase or merge, resolve, and push.`;

const placeOf = ({ path, line }: CommentInfo): string =>
  line === undefined ? `\`${path}\`` : `\`${path}\` line ${line}`;

const quoted = (body: string): string =>
  body
    .split('\n')
    .map((line) => `> ${line}`)
    .join('\n');

const commentPrompt = (pull: PullInfo, comment: CommentInfo): string =>
  `Review comment on ${nameOf(pull)}, ${placeOf(comment)}:\n\n${quoted(comment.body)}\n\nAddress it and push.`;

const conflictOf = (pull: PullInfo): FixEvent[] =>
  pull.conflict ? [{ key: conflictKey, text: conflictPrompt(pull) }] : [];

// Everything Auto-fix could prompt about now, in the order it prompts: failed Checks, a conflict, then comments oldest first.
export const eventsOf = ({ pull, failed, comments }: FixFacts): FixEvent[] => [
  ...failed.map((check) => ({
    key: checkKey(check),
    text: checkPrompt(pull, check),
  })),
  ...conflictOf(pull),
  ...comments.map((comment) => ({
    key: commentKey(comment.id),
    text: commentPrompt(pull, comment),
  })),
];
