import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, it } from 'vitest';

const primitives = import.meta.dirname;

function indexFiles(): string[] {
  return readdirSync(primitives, { recursive: true })
    .map(String)
    .filter((name) => /(?:^|\/)index\.ts$/.test(name));
}

// Type names an index file exports: `export { type A }` and `export type { A, B }`.
function exportedTypes(source: string): string[] {
  return [...source.matchAll(/export\s+(type\s+)?\{([^}]*)\}/g)].flatMap(
    ([, typeOnly, names = '']) =>
      names
        .split(',')
        .map((name) => name.trim())
        .filter((name) => name !== '')
        .filter((name) => typeOnly !== undefined || name.startsWith('type '))
        .map(
          (name) =>
            name
              .replace(/^type\s+/, '')
              .split(' as ')
              .at(-1) ?? '',
        ),
  );
}

const nestingSteps = new Map([
  ['{', 1],
  ['<', 1],
  ['(', 1],
  ['[', 1],
  ['}', -1],
  ['>', -1],
  [')', -1],
  [']', -1],
]);

// How deep in brackets each character sits; a bracket counts as outside the pair it opens or closes.
function nestingDepths(code: string): number[] {
  let depth = 0;

  return Array.from({ length: code.length }, (_, index) => {
    const step = nestingSteps.get(code.charAt(index)) ?? 0;

    depth += step;

    return step > 0 ? depth - 1 : depth;
  });
}

// Code without its `/* */` and `//` comments, cut with string splits rather than a pattern.
function withoutComments(code: string): string {
  const [head = '', ...blocks] = code.split('/*');

  const text = [head, ...blocks.map((block) => block.split('*/').at(-1))].join(
    ' ',
  );

  return text
    .split('\n')
    .map((line) => line.split('//')[0])
    .join('\n');
}

// The member names of `type <name> = { ... }`, read by matching brackets, so layout and spacing do not matter.
function memberNames(source: string, name: string): string[] {
  const code = withoutComments(source);

  const declaration = code.slice(
    code.search(new RegExp(String.raw`type\s+${name}\s*=`)),
  );

  const depths = nestingDepths(declaration);

  const end = depths.findIndex(
    (depth, index) => depth === 0 && declaration.charAt(index) === '}',
  );

  const topLevel = depths
    .slice(0, end)
    .map((depth, index) => (depth === 1 ? declaration.charAt(index) : ' '))
    .join('');

  return topLevel
    .split(/[;,]/)
    .map((member) => (member.split(':')[0] ?? '').trim().replace(/\?$/, ''))
    .filter((member) => member !== '');
}

// The names prop-vocabulary.mocks.ts lists in Primitives or Aliases.
function coveredTypes(source: string): string[] {
  return ['Primitives', 'Aliases', 'AdditionalPrimitives'].flatMap((name) =>
    memberNames(source, name),
  );
}

it('checks every type the primitives export against the prop vocabulary', () => {
  const exported = indexFiles().flatMap((file) =>
    exportedTypes(readFileSync(join(primitives, file), 'utf8')),
  );

  const covered = coveredTypes(
    ['prop-vocabulary.mocks.ts', 'prop-vocabulary-extra.mocks.ts']
      .map((file) => readFileSync(join(primitives, file), 'utf8'))
      .join('\n'),
  );

  expect([...new Set(covered)].sort()).toEqual([...new Set(exported)].sort());
});
