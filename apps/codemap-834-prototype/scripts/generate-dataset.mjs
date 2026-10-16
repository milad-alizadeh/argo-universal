import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const run = (args) =>
  execFileSync('git', args, {
    cwd: root,
    maxBuffer: 20 * 1024 * 1024,
    encoding: 'utf8',
  });
const commits = new Map();
for (const name of run(['log', '-1000', '--format=', '--name-only']).split(
  '\n',
)) {
  if (name) commits.set(name, (commits.get(name) ?? 0) + 1);
}
const files = [];
for (const path of run(['ls-files', '-z']).split('\0').filter(Boolean)) {
  if (path.startsWith('apps/codemap-834-prototype/')) continue;
  let text;
  try {
    text = readFileSync(`${root}/${path}`, 'utf8');
  } catch {
    continue;
  }
  if (text.includes('\0') || text.length > 500000) continue;
  const area = Math.max(1, text.split('\n').length);
  // Lexical branch count, not cyclomatic complexity. This third measure is intentionally explicit.
  const branches = (
    text.match(/\b(if|case|catch|while|for)\b|&&|\|\||\?\?/g) ?? []
  ).length;
  files.push({
    id: path,
    path,
    area,
    height: commits.get(path) ?? 0,
    branches,
    tone: branches >= 20 ? 'danger' : branches >= 9 ? 'warning' : 'border',
  });
}
files.sort((a, b) => a.path.localeCompare(b.path));
const result = {
  revision: run(['rev-parse', 'HEAD']).trim(),
  historyCommits: 1000,
  files,
};
writeFileSync(
  new URL('../src/dataset.json', import.meta.url),
  JSON.stringify(result, null, 2) + '\n',
);
console.log(`${files.length} real text files at ${result.revision}`);
