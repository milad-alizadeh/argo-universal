import { expect, it } from 'vitest';
import type { MoveSection } from './list-move-model';
import { moveSection } from './list-move-sections.mocks';
import { unfilteredMove } from './list-search-moves';

const full: MoveSection[] = [
  moveSection({
    key: 'a',
    id: 'todo',
    rows: ['login', 'logout', 'docs', 'log'],
  }),
  moveSection({ key: 'b', id: 'done', rows: ['blog', 'tests', 'catalog'] }),
];

// What a search for "log" shows.
const shown: MoveSection[] = [
  moveSection({ key: 'a', id: 'todo', rows: ['login', 'logout', 'log'] }),
  moveSection({ key: 'b', id: 'done', rows: ['blog', 'catalog'] }),
];

it('moves a row before the same row in the full order', () => {
  // Shown: before 'catalog', index 1 of done's shown rows; in full, 'catalog' sits at 2.
  expect(
    unfilteredMove(full, shown, { id: 'login', section: 'done', index: 1 }),
  ).toEqual({ id: 'login', section: 'done', index: 2 });
});

it('steps a row up past the rows the search hides', () => {
  // Shown: 'log' up a place lands before 'logout', which sits before the hidden 'docs'.
  expect(
    unfilteredMove(full, shown, { id: 'log', section: 'todo', index: 1 }),
  ).toEqual({ id: 'log', section: 'todo', index: 1 });
});

it('moves a row after every row shown to the true end of its Section', () => {
  expect(
    unfilteredMove(full, shown, { id: 'log', section: 'done', index: 2 }),
  ).toEqual({ id: 'log', section: 'done', index: 3 });
});
