import { applyListMove, type ListMove } from '@repo/contracts/kit-moves';
import { expect, it } from 'vitest';
import { menuMoves } from './list-move-menu';
import {
  resolveMove,
  type DropPlace,
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
  menuMoves(sections, id).map((entry) => entry.label);

const labels = (id: string): string[] => labelsIn(board, id);

// What each entry of a row's menu moves it to, when pressed now.
const menuIn = (
  sections: MoveSection[],
  id: string,
): (ListMove | undefined)[] =>
  menuMoves(sections, id).map(
    (entry) => resolveMove(sections, id, entry.intent)?.move,
  );

const drop = (id: string, place: DropPlace): ListMove | undefined =>
  resolveMove(board, id, { kind: 'drop', place })?.move;

it('offers a middle row both ways and every other Section', () => {
  expect(labels('docs')).toEqual(['Move up', 'Move down', toDoing, toDone]);
});

it('offers no move past either end of a Section', () => {
  expect(labels('login')).toEqual(['Move down', toDoing, toDone]);
  expect(labels('search')).toEqual(['Move to To do', toDone]);
});

it('moves a row to the end of another Section', () => {
  expect(
    resolveMove(board, 'login', { kind: 'end', sectionKey: 'b' })?.move,
  ).toEqual({ id: 'login', section: 'doing', index: 1 });
});

it('moves a row up and down by one', () => {
  expect(menuIn(board, 'docs').slice(0, 2)).toEqual([
    { id: 'docs', section: 'todo', index: 0 },
    { id: 'docs', section: 'todo', index: 2 },
  ]);
});

it('offers nothing for a row the List does not hold', () => {
  expect(menuMoves(board, 'nowhere')).toEqual([]);
});

it('offers the rows outside any Section as a Section to move to, and back out of', () => {
  const loose: MoveSection[] = [{ key: 'loose', rows: ['a', 'b'] }, doing];

  expect(labelsIn(loose, 'search')).toEqual(['Move out of Section']);
  expect(menuIn(loose, 'search')).toEqual([{ id: 'search', index: 2 }]);
  expect(menuIn(loose, 'a')).toEqual([
    { id: 'a', index: 1 },
    { id: 'a', section: 'doing', index: 1 },
  ]);
});

it('names a Section without a title by its place', () => {
  const untitled: MoveSection[] = [doing, { key: 'u', id: 'later', rows: [] }];

  expect(labelsIn(untitled, 'search')).toEqual(['Move to Section 2']);
});

it('keeps two Sections that share a title apart', () => {
  const twins: MoveSection[] = [
    doing,
    { key: 'x', id: 'mine', title: 'Done', rows: [] },
    { key: 'y', id: 'theirs', title: 'Done', rows: [] },
  ];

  const entries = menuMoves(twins, 'search');

  expect(new Set(entries.map((entry) => entry.key)).size).toBe(2);
  expect(menuIn(twins, 'search').map((move) => move?.section)).toEqual([
    'mine',
    'theirs',
  ]);
});

it('tells where a move lands, by Section title and position', () => {
  expect(
    resolveMove(board, 'login', { kind: 'end', sectionKey: 'b' })?.notice,
  ).toBe('Moved to Doing, position 2');
});

it('lands a row dropped further down its own Section one place up, as it leaves its slot', () => {
  // Dropped before 'tests' (insertion 2): it ends between docs and tests.
  expect(drop('login', { sectionKey: 'a', insertion: 2 })).toEqual({
    id: 'login',
    section: 'todo',
    index: 1,
  });
  expect(drop('tests', { sectionKey: 'a', insertion: 0 })).toEqual({
    id: 'tests',
    section: 'todo',
    index: 0,
  });
});

it('lands nothing when a row is dropped back on its own slot', () => {
  expect(drop('docs', { sectionKey: 'a', insertion: 1 })).toBeUndefined();
  expect(drop('docs', { sectionKey: 'a', insertion: 2 })).toBeUndefined();
});

it('lands a row in another Section at the insertion point', () => {
  expect(drop('docs', { sectionKey: 'c', insertion: 0 })).toEqual({
    id: 'docs',
    section: 'done',
    index: 0,
  });
});

it('shows a move before the owner answers it', () => {
  expect(
    applyListMove(board, { id: 'login', section: 'done', index: 0 }),
  ).toEqual([
    { key: 'a', id: 'todo', title: 'To do', rows: ['docs', 'tests'] },
    doing,
    { key: 'c', id: 'done', title: 'Done', rows: ['login'] },
  ]);
  expect(
    applyListMove(board, { id: 'tests', section: 'todo', index: 0 })[0]?.rows,
  ).toEqual(['tests', 'login', 'docs']);
});
