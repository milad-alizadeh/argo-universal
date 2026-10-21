import { describe, expect, it } from 'vitest';
import { resolveShortcuts } from './action-shortcuts';

const copy = { modifiers: ['meta', 'shift'], key: 'c' } as const;

describe('ActionList shortcut allocation', () => {
  it('keeps the first declaration, including disabled Actions, and normalizes modifier order and key case', () => {
    expect(
      resolveShortcuts(
        [
          { shortcut: copy, disabled: true },
          { shortcut: { modifiers: ['shift', 'meta'], key: 'C' } },
          { shortcut: { modifiers: [], key: 'Enter' } },
        ],
        false,
      ),
    ).toEqual([copy, undefined, { modifiers: [], key: 'Enter' }]);
  });

  it('refuses reserved Plugin shortcuts while allowing a built-in Action to use Return', () => {
    const shortcuts = [
      { shortcut: { modifiers: ['meta'], key: 'r' } },
      { shortcut: { modifiers: [], key: 'Enter' } },
      { shortcut: copy },
    ] as const;

    expect(resolveShortcuts(shortcuts, true)).toEqual([
      undefined,
      undefined,
      copy,
    ]);
    expect(resolveShortcuts(shortcuts, false)).toEqual(
      shortcuts.map(({ shortcut }) => shortcut),
    );
  });
  it('reserves Ctrl equivalents and resolves Meta/Ctrl collisions on Windows and Linux', () => {
    const reload = { modifiers: ['ctrl'], key: 'r' } as const;
    const primary = { modifiers: ['meta'], key: 'i' } as const;
    const physical = { modifiers: ['ctrl'], key: 'i' } as const;

    expect(resolveShortcuts([{ shortcut: reload }], true, 'ctrl')).toEqual([
      undefined,
    ]);
    expect(
      resolveShortcuts(
        [{ shortcut: primary }, { shortcut: physical }],
        false,
        'ctrl',
      ),
    ).toEqual([primary, undefined]);
  });
});
