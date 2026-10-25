import type { PluginQuery, ProcessResult } from '@argo/plugin-kit';
import type { CodeFile } from './model';

type ProcessQuery = Extract<PluginQuery, { api: 'process' }>;

type Measure = 'lines' | 'branches' | 'touches';

export type FileAnswers = Record<
  Measure,
  Pick<ProcessResult, 'stdout' | 'truncated'>
>;

// `-z` prints each path verbatim, ended by NUL; `-I` skips binary files. Each argv matches plugin.json exactly.
const grep = ['git', 'grep', '--no-color', '-I', '-z', '-c'];

// A word `if`, `case`, `catch`, `while` or `for`, or `&&`, `||` or `??`, in POSIX ERE so every git build reads it.
const branchPattern =
  '(^|[^A-Za-z0-9_])(if|case|catch|while|for)([^A-Za-z0-9_]|$)|&&|[|][|]|[?][?]';

export const historyCommits = 1000;

const run = (argv: string[]): ProcessQuery => ({
  api: 'process',
  action: 'run',
  argv,
});

// The Queries run in the Project's folder, because the Project details Slot's view belongs to that Project.
export const fileQueries: Record<Measure, ProcessQuery> = {
  lines: run([...grep, '-e', '^']),
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
  ]),
};

const separators = /[\0\n]/;

// The fields of the output; when the Server cut it short, the last one may be partial.
function fields({ stdout, truncated }: FileAnswers[Measure]): string[] {
  const parts = stdout.split(separators).filter(Boolean);

  return truncated ? parts.slice(0, -1) : parts;
}

// `git grep -c -z` prints `path NUL count` for each file with at least one matching line.
function counts(answer: FileAnswers[Measure]): Map<string, number> {
  const parts = fields(answer);

  const pairs = parts.flatMap((path, index): [string, number][] =>
    index % 2 === 0 ? [[path, Number(parts[index + 1])]] : [],
  );

  return new Map(pairs.filter(([, count]) => Number.isFinite(count)));
}

// `git log -z --name-only` names every file each commit changed.
function touches(answer: FileAnswers[Measure]): Map<string, number> {
  const result = new Map<string, number>();

  for (const path of fields(answer))
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
