/// <reference types="vite/client" />

import { expect, it } from 'vitest';

const sources: Record<string, string> = import.meta.glob(
  ['./**/*.ts', './**/*.tsx', '!./**/*.{test,stories}.*'],
  { eager: true, query: '?raw', import: 'default' },
);

const offending = (pattern: RegExp, allowed: readonly string[]): string[] =>
  Object.entries(sources)
    .filter(([file]) => !allowed.includes(file.slice('./'.length)))
    .filter(([, source]) => pattern.test(source))
    .map(([file]) => file);

// A parent that reads its children by type asks typed-children, which sees through Fragments and wrappers.
it('reads a type through the typed-children reader only', () => {
  expect(
    offending(/\bkitTypeOf\b/, ['typed-children.ts', 'wrapped-component.ts']),
  ).toEqual([]);
  // The scan sees the kit's sources.
  expect(offending(/\bkitTypeOf\b/, [])).toContain('./typed-children.ts');
});

// `child.type === Table`: a kit component on the other side of the comparison, which a wrapper would defeat.
it('never compares an element type against a kit component', () => {
  expect(offending(/\.type\s*[!=]==?\s*(?!Fragment\b)[A-Z]/, [])).toEqual([]);
  expect(offending(/\b[A-Z]\w*\s*[!=]==?\s*[\w.]+\.type\b/, [])).toEqual([]);
});
