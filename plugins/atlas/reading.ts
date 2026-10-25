import type { ProcessResult } from '@argo/plugin-kit';
import type { Answered, FileAnswers } from './project-files';

// What `useData` holds for one Query.
export interface Answer {
  data: ProcessResult | undefined;
  error?: string;
}

// Why git gave no answer: it ran and exited non-zero (the Project is not a repository), or it timed out or the Query itself failed.
export type Failure = 'not-repository' | 'no-answer';

export type Reading =
  | { state: 'loading' }
  | { state: 'failed'; failure: Failure }
  | { state: 'ready'; answers: FileAnswers };

// `git grep` exits 1 when no line matches, which is an empty answer, not a failure.
const grepAnswered = new Set<number | null>([0, 1]);

const noHistory: Answered = { stdout: '', truncated: false, timedOut: false };

const noAnswer = ({ data, error }: Answer): boolean =>
  error !== undefined || Boolean(data?.timedOut);

const exitedWithError = ({ data }: Answer): boolean =>
  data !== undefined && !grepAnswered.has(data.exitCode);

function grepFailure(answer: Answer): Failure | undefined {
  if (noAnswer(answer)) return 'no-answer';

  return exitedWithError(answer) ? 'not-repository' : undefined;
}

function answer({ stdout, truncated, timedOut }: ProcessResult): Answered {
  return { stdout, truncated, timedOut };
}

const historyRan = (data: ProcessResult): boolean =>
  data.timedOut || data.exitCode === 0;

// A Project without commits has no history to read, so its files read as unchanged. History that ran out of time still holds what git printed, and says it is partial.
function history({ data }: Answer): Answered {
  return data && historyRan(data) ? answer(data) : noHistory;
}

const waiting = ({ data, error }: Answer): boolean =>
  data === undefined && error === undefined;

function ready(answers: Record<keyof FileAnswers, Answer>): Reading {
  const { lines, branches, touches } = answers;

  if (!lines.data || !branches.data) return { state: 'loading' };

  return {
    state: 'ready',
    answers: {
      lines: answer(lines.data),
      branches: answer(branches.data),
      touches: history(touches),
    },
  };
}

const failure = ({
  lines,
  branches,
}: Record<keyof FileAnswers, Answer>): Failure | undefined =>
  grepFailure(lines) ?? grepFailure(branches);

// Failed as soon as either `git grep` fails; ready once git has answered all three.
export function readFiles(answers: Record<keyof FileAnswers, Answer>): Reading {
  const failed = failure(answers);

  if (failed) return { state: 'failed', failure: failed };

  if (waiting(answers.touches)) return { state: 'loading' };

  return ready(answers);
}
