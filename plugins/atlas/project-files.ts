import type { PluginQuery, ProcessResult } from '@argo/plugin-kit';
import type { CodeFile } from './model';

type ProcessQuery = Extract<PluginQuery, { api: 'process' }>;

type Measure = 'lines' | 'branches' | 'touches';

// What one Query printed, and whether the Server cut it short (output limit or time limit).
export type Answered = Pick<ProcessResult, 'stdout' | 'truncated' | 'timedOut'>;

export type FileAnswers = Record<Measure, Answered>;

// `-z` prints each path verbatim, ended by NUL; `-I` skips binary files. Each argv matches plugin.json exactly.
const grep = ['git', 'grep', '--no-color', '-I', '-z', '-c'];

// A word `if`, `case`, `catch`, `while` or `for`, or `&&`, `||` or `??`, in POSIX ERE so every git build reads it.
const branchPattern =
  '(^|[^A-Za-z0-9_])(if|case|catch|while|for)([^A-Za-z0-9_]|$)|&&|[|][|]|[?][?]';

// The history stays under the Server's 1 MiB output limit for a busy Project: this repository prints about 730 KB for 200 commits and 1.8 MB for 1,000.
export const historyCommits = 200;

const run = (argv: string[]): ProcessQuery => ({
  api: 'process',
  action: 'run',
  argv,
});

// The Queries run in the Project's folder, because the Project details Slot's view belongs to that Project.
export const fileQueries: Record<Measure, ProcessQuery> = {
  // `-G` fixes the pattern syntax, so a user's `grep.patternType` cannot change what `^` means.
  lines: run([...grep, '-G', '-e', '^']),
  branches: run([...grep, '-E', '-e', branchPattern]),
  touches: run([
    'git',
    'log',
    '--no-color',
    '-z',
    '-n',
    String(historyCommits),
    '--format=',
    '--name-only',
    // Paths relative to the Project's folder, as the greps print them, and only its history, when the Project is a folder inside a repository.
    '--relative',
    '--',
    '.',
  ]),
};

// One `path NUL count LF` record of `git grep -c -z`; the count is text until it is checked.
interface Counted {
  path: string;
  count: string;
  end: number;
}

// The record that starts at `start`, or nothing when the output ends before the record does. A path may hold a newline, so the NUL is found first and the line end after it.
function recordFrom(stdout: string, start: number): Counted | undefined {
  const nul = stdout.indexOf('\0', start);
  const lineEnd = stdout.indexOf('\n', nul + 1);

  if (nul === -1 || lineEnd === -1) return undefined;

  return {
    path: stdout.slice(start, nul),
    count: stdout.slice(nul + 1, lineEnd),
    end: lineEnd + 1,
  };
}

const readable = ({ path, count }: Counted): boolean =>
  path !== '' && /^\d+$/u.test(count);

// A record the Server cut short has no line end and is left out; a record with no path or no count is skipped.
function counts({ stdout }: Answered): Map<string, number> {
  const result = new Map<string, number>();

  for (
    let record = recordFrom(stdout, 0);
    record;
    record = recordFrom(stdout, record.end)
  )
    if (readable(record)) result.set(record.path, Number(record.count));

  return result;
}

// `git log -z --name-only` prints each file a commit changed, ended by NUL. When the Server cut the output short, what follows the last NUL may be partial.
function changedFiles({ stdout, truncated }: Answered): string[] {
  const names = stdout.split('\0');

  return (truncated ? names.slice(0, -1) : names).filter(Boolean);
}

// How many of the last commits named each file.
function touches(answer: Answered): Map<string, number> {
  const result = new Map<string, number>();

  for (const path of changedFiles(answer))
    result.set(path, (result.get(path) ?? 0) + 1);

  return result;
}

// Every text file git tracks in the Project, sorted by path.
export function projectFiles(answers: FileAnswers): CodeFile[] {
  const branches = counts(answers.branches);
  const changes = touches(answers.touches);

  return [...counts(answers.lines)]
    .map(([path, lines]) => ({
      path,
      lines,
      branches: branches.get(path) ?? 0,
      touches: changes.get(path) ?? 0,
    }))
    .sort((a, b) => a.path.localeCompare(b.path));
}
