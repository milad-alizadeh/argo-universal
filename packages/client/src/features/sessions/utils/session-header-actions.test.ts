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

describe('placeSessionHeaderActions', () => {
  it('puts the first header action beside "…" on a desktop and the rest in it, in Slot order', () => {
    const placed = placeSessionHeaderActions(declared, {
      phone: false,
      shows: showsAll,
    });

    expect(ids(placed.beside)).toEqual(['deploy']);
    expect(ids(placed.menu)).toEqual(['issue', 'board', 'report']);
  });

  it('puts every action in "…" on a phone', () => {
    const placed = placeSessionHeaderActions(declared, {
      phone: true,
      shows: showsAll,
    });

    expect(placed.beside).toEqual([]);
    expect(ids(placed.menu)).toEqual(['deploy', 'issue', 'board', 'report']);
  });

  it('leaves out a Plugin hidden on this Device, so the next header action takes its place', () => {
    const placed = placeSessionHeaderActions(declared, {
      phone: false,
      shows: (pluginId) => pluginId !== 'deploys',
    });

    expect(ids(placed.beside)).toEqual(['issue']);
    expect(ids(placed.menu)).toEqual(['board', 'report']);
  });

  it('keeps menu actions in "…" even when the header has room', () => {
    const placed = placeSessionHeaderActions(
      [{ pluginId: 'tracker', item: action('board', 'menu') }],
      { phone: false, shows: showsAll },
    );

    expect(placed.beside).toEqual([]);
    expect(ids(placed.menu)).toEqual(['board']);
  });
});
