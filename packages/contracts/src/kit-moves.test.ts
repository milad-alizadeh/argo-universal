import { describe, expect, it } from 'vitest';
import { applyListMove } from './kit-moves';

interface Card {
  id: string;
}

const card = (id: string): Card => ({ id });

const board = [
  { id: 'todo', rows: [card('login'), card('docs'), card('search')] },
  { id: 'done', rows: [card('ship')] },
];

const loose = [{ rows: ['alpha', 'beta'] }, { id: 'done', rows: ['gamma'] }];

type Row = string | Card;

const idsOf = (sections: readonly { rows: readonly Row[] }[]): string[][] =>
  sections.map(({ rows }) =>
    rows.map((row) => (typeof row === 'string' ? row : row.id)),
  );

describe('applyListMove', () => {
  it('lands a row at its index among the rows of the Section it moves to', () => {
    const moved = applyListMove(board, {
      id: 'docs',
      section: 'done',
      index: 1,
    });

    expect(idsOf(moved)).toEqual([
      ['login', 'search'],
      ['ship', 'docs'],
    ]);
  });

  it('counts the index within its own Section once the row has left its slot', () => {
    const moved = applyListMove(board, {
      id: 'login',
      section: 'todo',
      index: 2,
    });

    expect(idsOf(moved)).toEqual([['docs', 'search', 'login'], ['ship']]);
  });

  it('moves a row into the rows outside any Section when the move names none', () => {
    const moved = applyListMove(loose, { id: 'gamma', index: 0 });

    expect(idsOf(moved)).toEqual([['gamma', 'alpha', 'beta'], []]);
  });

  it('lands an index past the end at the end', () => {
    const moved = applyListMove(board, {
      id: 'login',
      section: 'done',
      index: 9,
    });

    expect(idsOf(moved)).toEqual([
      ['docs', 'search'],
      ['ship', 'login'],
    ]);
  });

  it('keeps the rows as they are for a row or a Section it does not hold', () => {
    expect(
      applyListMove(board, { id: 'nope', section: 'done', index: 0 }),
    ).toEqual(board);
    expect(
      applyListMove(board, { id: 'login', section: 'nope', index: 0 }),
    ).toEqual(board);
  });
});
