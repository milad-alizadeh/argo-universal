import { expect, it } from 'vitest';
import {
  landing,
  movedSections,
  rowMoves,
  type MoveSection,
} from './list-move-model';

const doing: MoveSection = {
  key: 'b',
  id: 'doing',
  title: 'Doing',
  rows: ['search'],
};

const board: MoveSection[] = [
  { key: 'a', id: 'todo', title: 'To do', rows: ['login', 'docs', 'tests'] },
  doing,
  { key: 'c', id: 'done', title: 'Done', rows: [] },
];

const toDoing = 'Move to Doing';

const toDone = 'Move to Done';

const labelsIn = (sections: MoveSection[], id: string): string[] =>
  rowMoves(sections, id).map((move) => move.label);

const labels = (id: string): string[] => labelsIn(board, id);

it('offers a middle row both ways and every other Section', () => {
  expect(labels('docs')).toEqual(['Move up', 'Move down', toDoing, toDone]);
});

it('offers no move past either end of a Section', () => {
  expect(labels('login')).toEqual(['Move down', toDoing, toDone]);
  expect(labels('search')).toEqual(['Move to To do', toDone]);
});

it('moves a row to the end of another Section', () => {
  expect(
    rowMoves(board, 'login').find((move) => move.label === toDoing)?.move,
  ).toEqual({ id: 'login', section: 'doing', index: 1 });
});

it('moves a row up and down by one', () => {
  const [up, down] = rowMoves(board, 'docs');

  expect(up?.move).toEqual({ id: 'docs', section: 'todo', index: 0 });
  expect(down?.move).toEqual({ id: 'docs', section: 'todo', index: 2 });
});

it('offers nothing for a row the List does not hold', () => {
  expect(rowMoves(board, 'nowhere')).toEqual([]);
});

it('offers the rows outside any Section as a Section to move to, and back out of', () => {
  const loose: MoveSection[] = [{ key: 'loose', rows: ['a', 'b'] }, doing];

  expect(rowMoves(loose, 'search')).toEqual([
    { label: 'Move out of Section', move: { id: 'search', index: 2 } },
  ]);
  expect(rowMoves(loose, 'a')).toEqual([
    { label: 'Move down', move: { id: 'a', index: 1 } },
    { label: toDoing, move: { id: 'a', section: 'doing', index: 1 } },
  ]);
});

it('names a Section without a title by its place', () => {
  const untitled: MoveSection[] = [doing, { key: 'u', id: 'later', rows: [] }];

  expect(labelsIn(untitled, 'search')).toEqual(['Move to Section 2']);
});

it('lands a row dropped further down its own Section one place up, as it leaves its slot', () => {
  // Dropped before 'tests' (insertion 2): it ends between docs and tests.
  expect(landing(board, 'login', { sectionKey: 'a', insertion: 2 })).toEqual({
    id: 'login',
    section: 'todo',
    index: 1,
  });
  expect(landing(board, 'tests', { sectionKey: 'a', insertion: 0 })).toEqual({
    id: 'tests',
    section: 'todo',
    index: 0,
  });
});

it('lands nothing when a row is dropped back on its own slot', () => {
  expect(
    landing(board, 'docs', { sectionKey: 'a', insertion: 1 }),
  ).toBeUndefined();
  expect(
    landing(board, 'docs', { sectionKey: 'a', insertion: 2 }),
  ).toBeUndefined();
});

it('lands a row in another Section at the insertion point', () => {
  expect(landing(board, 'docs', { sectionKey: 'c', insertion: 0 })).toEqual({
    id: 'docs',
    section: 'done',
    index: 0,
  });
});

it('shows a move before the owner answers it', () => {
  expect(
    movedSections(board, { id: 'login', section: 'done', index: 0 }),
  ).toEqual([
    { key: 'a', id: 'todo', title: 'To do', rows: ['docs', 'tests'] },
    doing,
    { key: 'c', id: 'done', title: 'Done', rows: ['login'] },
  ]);
  expect(
    movedSections(board, { id: 'tests', section: 'todo', index: 0 })[0]?.rows,
  ).toEqual(['tests', 'login', 'docs']);
});
