import { createElement } from 'react';
import { expect, it } from 'vitest';
import { contentType } from './list-child-identity';

// A minifier renames components to one or two letters, or leaves them without a name.
const named = (name: string): (() => null) =>
  Object.defineProperty((): null => null, 'name', { value: name });

it('gives rows drawn by different components different types, even when minified names collide or are blank', () => {
  expect(contentType(createElement(named('')))).not.toBe(
    contentType(createElement(named(''))),
  );
  expect(contentType(createElement(named('a')))).not.toBe(
    contentType(createElement(named('a'))),
  );
});

it('gives rows drawn by one component one type', () => {
  const row = named('Row');

  expect(contentType(createElement(row, { id: 1 }))).toBe(
    contentType(createElement(row, { id: 2 })),
  );
});
