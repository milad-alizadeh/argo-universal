import type { ProcessResult } from '@argo/plugin-kit';
import type { FileAnswers } from './project-files';

// What `useData` holds for one Query.
export interface Answer {
  data: ProcessResult | undefined;
  error?: string;
}

export type Reading =
  | { state: 'loading' }
  | { state: 'failed' }
  | { state: 'ready'; answers: FileAnswers };

// `git grep` exits 1 when no line matches, which is an empty answer, not a failure.
const grepAnswered = new Set<number | null>([0, 1]);

const noHistory = { stdout: '', truncated: false };

const settled = (data: ProcessResult, codes: Set<number | null>): boolean =>
  !data.timedOut && codes.has(data.exitCode);

const historyAnswered = new Set<number | null>([0]);

function grepFailed({ data, error }: Answer): boolean {
  if (error !== undefined) return true;

  return data !== undefined && !settled(data, grepAnswered);
}

function answer({ stdout, truncated }: ProcessResult): FileAnswers['lines'] {
  return { stdout, truncated };
}

// A Project without commits has no history to read, so its files read as unchanged.
function history({ data }: Answer): FileAnswers['touches'] {
  if (!data || !settled(data, historyAnswered)) return noHistory;

  return answer(data);
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

const failed = ({
  lines,
  branches,
}: Record<keyof FileAnswers, Answer>): boolean =>
  grepFailed(lines) || grepFailed(branches);

// Failed as soon as either `git grep` fails; ready once git has answered all three.
export function readFiles(answers: Record<keyof FileAnswers, Answer>): Reading {
  if (failed(answers)) return { state: 'failed' };

  if (waiting(answers.touches)) return { state: 'loading' };

  return ready(answers);
}
