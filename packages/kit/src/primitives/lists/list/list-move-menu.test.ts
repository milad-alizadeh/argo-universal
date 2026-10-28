import { expect, it } from 'vitest';
import { pickSections, stepMoves, type PickSection } from './list-move-menu';
import { sectionKey, type MoveSection } from './list-move-model';

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

const titles = new Map([
  ['login', 'Login'],
  ['docs', 'Docs'],
  ['tests', 'Tests'],
  ['search', 'Search'],
]);

const titleOf = (id: string, index: number): string =>
  titles.get(id) ?? `row ${index + 1}`;

const steps = (id: string): string[] =>
  stepMoves(board, id).map((entry) => entry.label);

const picked = (sections: MoveSection[], id: string): PickSection[] =>
  pickSections(sections, id, titleOf);

const labelsIn = (sections: PickSection[], key: string): string[] =>
  sections
    .find((section) => section.key === key)
    ?.spots.map((spot) => spot.label) ?? [];

it('offers a middle row both steps', () => {
  expect(steps('docs')).toEqual(['Move up', 'Move down']);
});

it('offers the first row only a step down', () => {
  expect(steps('login')).toEqual(['Move down']);
});

it('offers a lone row no step', () => {
  expect(steps('search')).toEqual([]);
});

it('picks the top, after each row but the last, or the end of another Section', () => {
  expect(labelsIn(picked(board, 'search'), 'a')).toEqual([
    'Top',
    'After Login',
    'After Docs',
    'End',
  ]);
});

it('leaves out the places a row already holds in its own Section', () => {
  expect(labelsIn(picked(board, 'docs'), 'a')).toEqual(['Top', 'End']);
});

it('offers only the top of an empty Section', () => {
  expect(labelsIn(picked(board, 'docs'), 'c')).toEqual(['Top']);
});

it('leaves out a Section with nowhere to move to', () => {
  expect(picked(board, 'search').map((section) => section.key)).toEqual([
    'a',
    'c',
  ]);
});

it('places a row after the row it names', () => {
  expect(picked(board, 'search')[0]?.spots[1]?.place).toEqual({
    sectionKey: sectionKey('a'),
    insertion: 1,
  });
});

it('names a row without a title by its place', () => {
  const untitled: MoveSection[] = [
    { key: sectionKey('a'), id: 'todo', rows: ['x', 'y', 'z'] },
    { key: sectionKey('b'), id: 'doing', rows: ['search'] },
  ];

  expect(labelsIn(picked(untitled, 'search'), 'a')).toContain('After row 2');
});

it('titles a Section without a title by its place', () => {
  const untitled: MoveSection[] = [
    { key: sectionKey('a'), id: 'todo', rows: ['x'] },
    { key: sectionKey('b'), id: 'doing', rows: ['search'] },
  ];

  expect(picked(untitled, 'search')[0]?.title).toBe('Section 1');
});

it('titles the rows outside any Section beside Sections', () => {
  const loose: MoveSection[] = [
    { key: sectionKey('loose'), rows: ['a', 'b'] },
    { key: sectionKey('b'), id: 'doing', title: 'Doing', rows: ['search'] },
  ];

  expect(picked(loose, 'search')[0]?.title).toBe('No Section');
});

it('lists one untitled Section for a List without Sections', () => {
  const plain: MoveSection[] = [
    { key: sectionKey('loose'), rows: ['a', 'b', 'c'] },
  ];

  expect(picked(plain, 'a')).toEqual([
    expect.objectContaining({ title: undefined, key: sectionKey('loose') }),
  ]);
});
