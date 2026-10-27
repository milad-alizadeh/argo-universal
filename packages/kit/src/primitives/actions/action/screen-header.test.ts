import { describe, expect, it } from 'vitest';
import type { DeclaredAction } from './action-declarations';
import {
  screenHeader,
  type HeaderDeclaration,
  type HeaderRoom,
} from './screen-header';

const action = (
  id: string,
  extra?: Partial<DeclaredAction>,
): DeclaredAction => ({
  id,
  label: id,
  icon: 'add',
  onPress: () => {},
  ...extra,
});

const begin = (): void => {};

const declared = (
  names: string[],
  extra?: Partial<HeaderDeclaration>,
): HeaderDeclaration => ({
  groups: names.length ? [{ actions: names.map((name) => action(name)) }] : [],
  primary: [],
  search: false,
  selection: null,
  anchors: [],
  ...extra,
});

const withPrimary = (
  extra?: Partial<DeclaredAction>,
): HeaderDeclaration['primary'] => [action('new', extra)];

const directIds = (
  declaration: HeaderDeclaration,
  room: HeaderRoom,
): string[] => screenHeader(declaration, room).direct.map((entry) => entry.id);

describe('screenHeader', () => {
  it.each([
    ['heading', declared(['a', 'b', 'c']), ['a', 'b', 'c']],
    ['heading', declared(['a', 'b', 'c', 'd']), ['a', 'b']],
    ['ios', declared(['a', 'b']), ['a', 'b']],
    ['ios', declared(['a', 'b'], { primary: withPrimary() }), []],
    ['ios', declared(['a'], { primary: withPrimary() }), ['a']],
    ['android', declared(['a', 'b']), ['a', 'b']],
    ['android', declared(['a', 'b'], { search: true }), []],
    ['android', declared(['a'], { search: true }), ['a']],
  ] satisfies [HeaderRoom, HeaderDeclaration, string[]][])(
    'gives the %s room its own number of buttons',
    (room, declaration, ids) => {
      expect(directIds(declaration, room)).toEqual(ids);
    },
  );

  it('does not count the iOS Select entry among the bar buttons', () => {
    const selection = { bar: null, header: null, begin };

    expect(directIds(declared(['a', 'b'], { selection }), 'ios')).toEqual([
      'a',
      'b',
    ]);
  });

  it('keeps the first Action with an icon as the one primary Action', () => {
    const primary = [action('label only', { icon: undefined }), action('new')];

    expect(screenHeader(declared([], { primary }), 'heading').primary?.id).toBe(
      'new',
    );
  });

  it('shows a disabled primary Action as a button but never as the Android FAB', () => {
    const declaration = declared([], {
      primary: withPrimary({ disabled: true }),
    });

    expect(screenHeader(declaration, 'heading').primary?.id).toBe('new');
    expect(screenHeader(declaration, 'ios').primary?.id).toBe('new');
    expect(screenHeader(declaration, 'android').primary).toBeUndefined();
  });

  it('lets the room give a disabled primary Action back its place among the iOS buttons', () => {
    const declaration = declared(['a', 'b'], {
      primary: withPrimary({ disabled: true }),
    });

    expect(directIds(declaration, 'ios')).toEqual([]);
    expect(directIds(declaration, 'android')).toEqual(['a', 'b']);
  });

  it.each([
    ['heading', begin],
    ['ios', begin],
    ['android', null],
  ] satisfies [HeaderRoom, (() => void) | null][])(
    'draws the Select entry in the %s room only where it has one',
    (room, select) => {
      const selection = { bar: null, header: null, begin };

      expect(screenHeader(declared([], { selection }), room).select).toBe(
        select,
      );
    },
  );

  it.each(['heading', 'ios', 'android'] satisfies HeaderRoom[])(
    'replaces the whole %s header with a selecting List’s',
    (room) => {
      const selection = { bar: null, header: 'Selecting', begin };

      const declaration = declared(['a'], {
        primary: withPrimary(),
        selection,
      });

      const header = screenHeader(declaration, room);

      expect(header.primary).toBeUndefined();
      expect(header).toMatchObject({
        selecting: 'Selecting',
        direct: [],
        overflow: [],
        select: null,
        empty: true,
      });
    },
  );

  it.each([
    ['no Actions', declared([]), true],
    ['an Action', declared(['a']), false],
    ['a primary Action', declared([], { primary: withPrimary() }), false],
    [
      'a Select entry',
      declared([], { selection: { bar: null, header: null, begin } }),
      false,
    ],
  ] satisfies [string, HeaderDeclaration, boolean][])(
    'tells whether a header with %s is empty',
    (_, declaration, empty) => {
      expect(screenHeader(declaration, 'heading').empty).toBe(empty);
    },
  );
});
