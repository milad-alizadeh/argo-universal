import type { LoaderInput, ProcessResult } from '@argo/plugin-kit';
import { fileQueries, type FileAnswers } from './project-files';

// What one Query answered, or why it could not.
export interface Answer {
  data?: ProcessResult;
  error?: string;
}

export type Reading =
  | { state: 'failed' }
  | { state: 'ready'; answers: FileAnswers };

type Measure = keyof FileAnswers;

// `git grep` exits 1 when no line matches, which is an empty answer, not a failure.
const grepAnswered = new Set<number | null>([0, 1]);

const noHistory = { stdout: '', truncated: false };

const settled = (data: ProcessResult, codes: Set<number | null>): boolean =>
  !data.timedOut && codes.has(data.exitCode);

const historyAnswered = new Set<number | null>([0]);

// What `git grep` answered, or undefined when it failed.
const grepData = ({ data }: Answer): ProcessResult | undefined =>
  data && settled(data, grepAnswered) ? data : undefined;

function answer({ stdout, truncated }: ProcessResult): FileAnswers['lines'] {
  return { stdout, truncated };
}

// A Project without commits has no history to read, so its files read as unchanged.
function history({ data }: Answer): FileAnswers['touches'] {
  if (!data || !settled(data, historyAnswered)) return noHistory;

  return answer(data);
}

// Failed when either `git grep` fails; ready with all three answers otherwise.
export function readFiles(answers: Record<Measure, Answer>): Reading {
  const lines = grepData(answers.lines);
  const branches = grepData(answers.branches);

  if (!lines || !branches) return { state: 'failed' };

  const touches = history(answers.touches);

  return {
    state: 'ready',
    answers: { lines: answer(lines), branches: answer(branches), touches },
  };
}

// One Query read through Argo's cache, a refusal kept as its answer's error.
const readAnswer = (
  read: LoaderInput['read'],
  measure: Measure,
): Promise<Answer> =>
  read(fileQueries[measure]).then(
    (data) => ({ data }),
    (error: Error) => ({ error: error.message }),
  );

/*
 * The map's Loader (ADR-0050): git's three answers at once, each a Query run in the folder of the Project the
 * page opened for, which its details row drilled in from.
 */
export async function loadFiles(read: LoaderInput['read']): Promise<Reading> {
  const [lines, branches, touches] = await Promise.all([
    readAnswer(read, 'lines'),
    readAnswer(read, 'branches'),
    readAnswer(read, 'touches'),
  ]);

  return readFiles({ lines, branches, touches });
}
