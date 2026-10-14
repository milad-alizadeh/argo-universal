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

// The names prop-vocabulary.mocks.ts lists in Primitives or Aliases: the only two-space-indented keys there.
function coveredTypes(source: string): string[] {
  return [...source.matchAll(/^ {2}(\w+):/gm)].flatMap(
    ([, name]) => name ?? [],
  );
}

it('checks every type the primitives export against the prop vocabulary', () => {
  const exported = indexFiles().flatMap((file) =>
    exportedTypes(readFileSync(join(primitives, file), 'utf8')),
  );

  const covered = coveredTypes(
    readFileSync(join(primitives, 'prop-vocabulary.mocks.ts'), 'utf8'),
  );

  expect([...new Set(covered)].sort()).toEqual([...new Set(exported)].sort());
});
