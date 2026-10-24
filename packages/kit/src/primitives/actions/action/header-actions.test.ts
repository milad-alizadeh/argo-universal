import { describe, expect, it } from 'vitest';
import {
  orderedGroups,
  type ActionGroup,
  type DeclaredAction,
  type DeclaredEntry,
  type DeclaredSubmenu,
} from './action-declarations';
import { splitHeaderActions } from './header-actions';

function action(id: string, tone?: 'danger'): DeclaredAction {
  return { id, label: id, icon: 'add', onPress: () => {}, tone };
}

function submenu(id: string): DeclaredSubmenu {
  return {
    id,
    label: id,
    icon: 'filter-list',
    sections: [{ actions: [action(`${id}/0/0`)] }],
  };
}

// `sort` and `view` are submenus; every other name is a press Action.
const entry = (name: string): DeclaredEntry =>
  ['sort', 'view'].includes(name) ? submenu(name) : action(name);

const ids = (actions: DeclaredEntry[]): string[] =>
  actions.map((entry) => entry.id);

const sections = (groups: ActionGroup[]): [string | undefined, string[]][] =>
  groups.map((group) => [group.title, ids(group.actions)]);

describe('splitHeaderActions', () => {
  it.each([
    ['fewer safe Actions than slots', ['a', 'b'], 3],
    ['as many safe Actions as slots', ['a', 'b', 'c'], 3],
  ])('shows every Action as a button with %s', (_, names, slots) => {
    const split = splitHeaderActions(
      [{ actions: names.map((name) => action(name)) }],
      slots,
    );

    expect(ids(split.direct)).toEqual(names);
    expect(split.overflow).toEqual([]);
  });

  it('keeps the last slot for the overflow menu when the safe Actions outnumber the slots', () => {
    const groups = [{ actions: ['a', 'b', 'c', 'd'].map((n) => action(n)) }];

    const split = splitHeaderActions(groups, 3);

    expect(ids(split.direct)).toEqual(['a', 'b']);
    expect(sections(split.overflow)).toEqual([[undefined, ['c', 'd']]]);
  });

  it('never shows a danger Action as a button and lists it last in the overflow menu', () => {
    const groups = orderedGroups([
      { actions: [action('delete', 'danger'), action('open')] },
    ]);

    const split = splitHeaderActions(groups, 3);

    expect(ids(split.direct)).toEqual(['open']);
    expect(sections(split.overflow)).toEqual([[undefined, ['delete']]]);
  });

  it('leaves an Action without an icon in the overflow menu', () => {
    const plain = { ...action('rename'), icon: undefined };

    const split = splitHeaderActions([{ actions: [plain, action('open')] }], 3);

    expect(ids(split.direct)).toEqual(['open']);
    expect(sections(split.overflow)).toEqual([[undefined, ['rename']]]);
  });

  it('keeps Section titles for the Actions left in the overflow menu', () => {
    const groups = orderedGroups([
      {
        boundary: true,
        title: 'Project',
        actions: [action('add'), action('import'), action('archive')],
      },
      { boundary: true, title: 'View', actions: [action('filters')] },
      { actions: [action('remove', 'danger')] },
    ]);

    const split = splitHeaderActions(groups, 2);

    expect(ids(split.direct)).toEqual(['add']);
    expect(sections(split.overflow)).toEqual([
      ['Project', ['import', 'archive']],
      ['View', ['filters']],
      [undefined, ['remove']],
    ]);
  });

  it('puts every Action in the overflow menu when only one slot is free', () => {
    const groups = [{ actions: [action('a'), action('b')] }];

    const split = splitHeaderActions(groups, 1);

    expect(split.direct).toEqual([]);
    expect(sections(split.overflow)).toEqual([[undefined, ['a', 'b']]]);
  });

  it.each([
    { entries: ['sort', 'a'], slots: 2, direct: ['sort', 'a'], overflow: [] },
    {
      entries: ['a', 'sort', 'b', 'c'],
      slots: 3,
      direct: ['a', 'sort'],
      overflow: ['b', 'c'],
    },
    {
      entries: ['sort', 'a', 'view'],
      slots: 2,
      direct: ['sort'],
      overflow: ['a', 'view'],
    },
    { entries: ['sort', 'a'], slots: 1, direct: [], overflow: ['sort', 'a'] },
  ])(
    'counts a submenu against $slots slots: $entries shows $direct',
    ({ entries, slots, direct, overflow }) => {
      const split = splitHeaderActions(
        [{ actions: entries.map(entry) }],
        slots,
      );

      expect(ids(split.direct)).toEqual(direct);
      expect(split.overflow.flatMap((group) => ids(group.actions))).toEqual(
        overflow,
      );
    },
  );

  it('keeps a submenu whole, its Sections with it, in the overflow menu', () => {
    const sort = submenu('sort');
    const add = action('add');

    const split = splitHeaderActions([{ actions: [sort, add] }], 1);

    expect(split.overflow).toStrictEqual([
      {
        actions: [
          {
            id: 'sort',
            label: 'sort',
            icon: 'filter-list',
            sections: [{ actions: [sort.sections[0]?.actions[0]] }],
          },
          add,
        ],
      },
    ]);
  });

  it('still never shows a danger Action as a button beside a submenu', () => {
    const groups = orderedGroups([
      { actions: [action('delete', 'danger'), submenu('sort')] },
    ]);

    const split = splitHeaderActions(groups, 3);

    expect(ids(split.direct)).toEqual(['sort']);
    expect(sections(split.overflow)).toEqual([[undefined, ['delete']]]);
  });
});
