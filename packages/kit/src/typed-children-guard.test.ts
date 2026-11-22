import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { expect, it } from 'vitest';

const src = __dirname;

function sources(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);

    if (entry.isDirectory()) return sources(path);

    return /\.tsx?$/.test(entry.name) && !/\.(test|stories)\./.test(entry.name)
      ? [path]
      : [];
  });
}

const offending = (pattern: RegExp, allowed: readonly string[]): string[] =>
  sources(src)
    .filter((file) => !allowed.includes(relative(src, file)))
    .filter((file) => pattern.test(readFileSync(file, 'utf8')))
    .map((file) => relative(src, file));

// A parent that reads its children by type asks typed-children, which sees through Fragments and wrappers.
it('reads a type through the typed-children reader only', () => {
  expect(
    offending(/\bkitTypeOf\b/, [
      'typed-children.ts',
      'wrapped-component.ts',
      'wrapped-component.test.ts',
    ]),
  ).toEqual([]);
});

it('never compares an element type against a kit component', () => {
  // `child.type === Table`, `type !== Row`: a capitalised component on the other side.
  expect(offending(/\.type\s*[!=]==?\s*(?!Fragment\b)[A-Z]/, [])).toEqual([]);
  expect(offending(/[A-Z]\w*\s*[!=]==?\s*\w+(\.\w+)*\.type\b/, [])).toEqual([]);
});
