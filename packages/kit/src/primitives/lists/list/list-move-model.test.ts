import { applyListMove, type ListMove } from '@repo/contracts/kit-moves';
import { expect, it } from 'vitest';
import {
  resolveMove,
  sectionKey,
  type DropPlace,
  type MoveSection,
} from './list-move-model';

const board: MoveSection[] = [
  {
    key: sectionKey('a'),
    id: 'todo',
    title: 'To do',
    rows: ['login', 'docs', 'tests'],
  },
  { key: sectionKey('b'), id: 'doing', title: 'Doing', rows: ['search'] },
  { key: sectionKey('c'), id: 'done', title: 'Done', rows: [] },
];

const placed = (id: string, place: DropPlace): ListMove | undefined =>
  resolveMove(board, id, { kind: 'place', place })?.move;

const stepped = (id: string, by: -1 | 1): ListMove | undefined =>
  resolveMove(board, id, { kind: 'step', by })?.move;

it('moves a row up by one', () => {
  expect(stepped('docs', -1)).toEqual({
    id: 'docs',
    section: 'todo',
    index: 0,
  });
});

it('moves a row down by one', () => {
  expect(stepped('docs', 1)).toEqual({ id: 'docs', section: 'todo', index: 2 });
});

it('moves no row past the end of its Section', () => {
  expect(stepped('tests', 1)).toBeUndefined();
});

it('moves nothing for a row the List does not hold', () => {
  expect(stepped('nowhere', 1)).toBeUndefined();
});

it('places a row at the end of another Section', () => {
  expect(
    placed('login', { sectionKey: sectionKey('b'), insertion: 1 }),
  ).toEqual({
    id: 'login',
    section: 'doing',
    index: 1,
  });
});

it('lands a row placed further down its own Section one place up, as it leaves its slot', () => {
  // Placed before 'tests' (insertion 2): it ends between docs and tests.
  expect(
    placed('login', { sectionKey: sectionKey('a'), insertion: 2 }),
  ).toEqual({
    id: 'login',
    section: 'todo',
    index: 1,
  });
});

it('lands a row placed further up its own Section where it is placed', () => {
  expect(
    placed('tests', { sectionKey: sectionKey('a'), insertion: 0 }),
  ).toEqual({
    id: 'tests',
    section: 'todo',
    index: 0,
  });
});

it('lands nothing when a row is placed just before itself', () => {
  expect(
    placed('docs', { sectionKey: sectionKey('a'), insertion: 1 }),
  ).toBeUndefined();
});

it('lands nothing when a row is placed just after itself', () => {
  expect(
    placed('docs', { sectionKey: sectionKey('a'), insertion: 2 }),
  ).toBeUndefined();
});

const toDoingSecond = (): string | undefined =>
  resolveMove(board, 'login', {
    kind: 'place',
    place: { sectionKey: sectionKey('b'), insertion: 1 },
  })?.notice;

it('tells which Section a move lands in, by its title', () => {
  expect(toDoingSecond()).toContain('Doing');
});

it('tells the position a move lands at, counted from one', () => {
  expect(toDoingSecond()).toMatch(/\b2\b/);
});

it('shows a move to another Section before the owner answers it', () => {
  expect(
    applyListMove(board, { id: 'login', section: 'done', index: 0 })[2]?.rows,
  ).toEqual(['login']);
});

it('shows a move within a Section before the owner answers it', () => {
  expect(
    applyListMove(board, { id: 'tests', section: 'todo', index: 0 })[0]?.rows,
  ).toEqual(['tests', 'login', 'docs']);
});
