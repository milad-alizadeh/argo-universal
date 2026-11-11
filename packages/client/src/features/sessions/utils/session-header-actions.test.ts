import type { SessionHeaderAction } from '@repo/contracts/plugins/declared-slots';
import { describe, expect, it } from 'vitest';
import { placeSessionHeaderActions } from './session-header-actions';

const action = (
  id: string,
  placement: SessionHeaderAction['placement'],
): SessionHeaderAction => ({
  id,
  label: id,
  icon: { sf: 'star' },
  placement,
  target: { type: 'page', path: `/${id}` },
});

// Slot order, as the Server sends it.
const declared = [
  { pluginId: 'deploys', item: action('deploy', 'header') },
  { pluginId: 'tracker', item: action('issue', 'header') },
  { pluginId: 'tracker', item: action('board', 'menu') },
  { pluginId: 'coverage', item: action('report', 'header') },
];

const ids = (items: readonly { item: SessionHeaderAction }[]): string[] =>
  items.map(({ item }) => item.id);

const showsAll = (): boolean => true;

const allFilled = (): boolean => true;

const toCard: SessionHeaderAction = {
  ...action('issue-card', 'header'),
  target: { type: 'card', cardId: 'issue' },
};

// The actions beside "…" on a desktop when a card action leads, its card filled or not.
const besideWithCard = (filled: boolean): string[] =>
  ids(
    placeSessionHeaderActions(
      [{ pluginId: 'tracker', item: toCard }, ...declared],
      { phone: false, shows: showsAll, filled: () => filled },
    ).beside,
  );

describe('placeSessionHeaderActions', () => {
  it('leaves out an action whose Workbench card has nothing to show', () => {
    expect(besideWithCard(false)).toEqual(['deploy']);
  });

  it('keeps an action whose Workbench card has something to show', () => {
    expect(besideWithCard(true)).toEqual(['issue-card']);
  });

  it('puts the first header action beside "…" on a desktop and the rest in it, in Slot order', () => {
    const placed = placeSessionHeaderActions(declared, {
      phone: false,
      shows: showsAll,
      filled: allFilled,
    });

    expect(ids(placed.beside)).toEqual(['deploy']);
    expect(ids(placed.menu)).toEqual(['issue', 'board', 'report']);
  });

  it('puts every action in "…" on a phone', () => {
    const placed = placeSessionHeaderActions(declared, {
      phone: true,
      shows: showsAll,
      filled: allFilled,
    });

    expect(placed.beside).toEqual([]);
    expect(ids(placed.menu)).toEqual(['deploy', 'issue', 'board', 'report']);
  });

  it('leaves out a Plugin hidden on this Device, so the next header action takes its place', () => {
    const placed = placeSessionHeaderActions(declared, {
      phone: false,
      shows: (pluginId) => pluginId !== 'deploys',
      filled: allFilled,
    });

    expect(ids(placed.beside)).toEqual(['issue']);
    expect(ids(placed.menu)).toEqual(['board', 'report']);
  });

  it('keeps menu actions in "…" even when the header has room', () => {
    const placed = placeSessionHeaderActions(
      [{ pluginId: 'tracker', item: action('board', 'menu') }],
      { phone: false, shows: showsAll, filled: allFilled },
    );

    expect(placed.beside).toEqual([]);
    expect(ids(placed.menu)).toEqual(['board']);
  });
});
