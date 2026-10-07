import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const self = fileURLToPath(import.meta.url);

const biomeIgnore = /biome-ignore(?:-all|-start|-end)?(?![\w-])(.*)$/;
const named =
  /^\s+(?:lint\/[a-zA-Z]+\/[a-zA-Z][\w-]*(?:\([^)]*\))?\s*)+(?::\s*\S.*)?$/;
const plugin = /lint\/plugin\b/;
const complexity =
  /lint\/[a-zA-Z]+\/(?:noExcessiveCognitiveComplexity|noExcessiveLinesPerFunction|noExcessiveLinesPerFile|useMaxParams|noExcessiveNestedCallbacks)\b/;

const textRules: { pattern: RegExp; message: string }[] = [
  {
    pattern: /\b(?:TODO|FIXME|XXX|HACK)\b/,
    message: 'Open a GitHub issue for the work instead of a marker.',
  },
  { pattern: /@ts-nocheck/, message: 'Fix the types; every file is checked.' },
  {
    pattern: /@ts-expect-error\s*(?:--\s*)?(?:\*\/\s*)?$/,
    message: 'Say why the error is expected.',
  },
  {
    pattern: /jscpd:ignore-start\s*(?:\*\/\s*)?$/,
    message: 'Say why the clone stays.',
  },
];

// The text after a comment opener on this line, or undefined when the line has none.
const commentText = (line: string): string | undefined => {
  const opener = line.search(/\/\/|\/\*/);
  if (opener !== -1) return line.slice(opener + 2);
  const trimmed = line.trimStart();
  return trimmed.startsWith('*') ? trimmed.slice(1) : undefined;
};

const messagesFor = (text: string): string[] => {
  const messages = textRules
    .filter(({ pattern }) => pattern.test(text))
    .map(({ message }) => message);
  const suppression = biomeIgnore.exec(text);
  if (suppression) {
    const rest = (suppression[1] ?? '').split('*/')[0] ?? '';
    if (!named.test(rest))
      messages.push('Name the rule as lint/<group>/<rule>.');
    if (plugin.test(rest))
      messages.push("Exempt the file in the plugin's includes instead.");
    if (complexity.test(rest))
      messages.push(
        'Answer the alarm with docs/agents/code-shape.md or the debt list.',
      );
  }
  return messages;
};

const paths = process.argv.slice(2);
const files = (
  paths.length > 0
    ? paths
    : execFileSync(
        'git',
        ['ls-files', '--', '*.ts', '*.tsx', '*.mts', '*.mjs'],
        { cwd: root, encoding: 'utf8' },
      )
        .split('\n')
        .filter(Boolean)
        .map((file) => resolve(root, file))
)
  .filter((file) => !/\.gen\./.test(file) && resolve(file) !== self)
  .sort();

const problems: string[] = [];
for (const file of files) {
  const display = relative(root, resolve(file));
  readFileSync(file, 'utf8')
    .split('\n')
    .forEach((line, index) => {
      const text = commentText(line);
      if (text === undefined) return;
      for (const message of messagesFor(text))
        problems.push(`${display}:${index + 1}: ${message}`);
    });
}

for (const problem of problems) console.error(problem);
console.log(
  `check-comments: ${files.length} files, ${problems.length} problems`,
);
process.exit(problems.length > 0 ? 1 : 0);
