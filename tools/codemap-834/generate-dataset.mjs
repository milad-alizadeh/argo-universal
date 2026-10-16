import { writeFileSync } from 'node:fs';
import { file } from './files.mjs';
import { git, activity, historyCommits, root } from './git.mjs';

const excluded = ['apps/codemap-834-prototype/', 'tools/codemap-834/'];

function included(path) {
  return !excluded.some((prefix) => path.startsWith(prefix));
}

function files() {
  const commits = activity();

  const paths = git(['ls-files', '-z'])
    .split('\0')
    .filter(Boolean)
    .filter(included);

  return paths
    .flatMap((path) => {
      const value = file(path, commits);

      return value ? [value] : [];
    })
    .sort((a, b) => a.path.localeCompare(b.path));
}

const result = {
  revision: git(['rev-parse', 'HEAD']).trim(),
  historyCommits,
  files: files(),
};

writeFileSync(
  `${root}/apps/codemap-834-prototype/src/dataset.json`,
  JSON.stringify(result, null, 2) + '\n',
);

console.log(`${result.files.length} real text files at ${result.revision}`);
