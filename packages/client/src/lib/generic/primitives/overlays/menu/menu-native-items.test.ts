import { describe, expect, it, vi } from 'vitest';
import { nativeMenuItems, nativeMenuSections } from './menu-native-items';

const scopes = [
  { value: 'once', label: 'Allow once' },
  { value: 'always', label: 'Always allow' },
] as const;

describe('a system menu', () => {
  it('lists every option, with only the chosen one checked', () => {
    const items = nativeMenuItems({
      options: scopes,
      value: 'always',
      onValueChange: vi.fn<(value: string) => void>(),
    });

    expect(
      items.map(({ title, checked }) => ({ title, checked })),
    ).toStrictEqual([
      { title: 'Allow once', checked: false },
      { title: 'Always allow', checked: true },
    ]);
  });

  it('reports the value of the option chosen', () => {
    const onValueChange = vi.fn<(value: string) => void>();

    nativeMenuItems({
      options: scopes,
      value: 'always',
      onValueChange,
    })[0]?.choose();

    expect(onValueChange).toHaveBeenCalledWith('once');
  });

  it('lists each group as its own section, checking each group’s own value', () => {
    const onLayoutChange = vi.fn<(value: string) => void>();

    const menu = {
      groups: [
        { value: 'once', options: scopes, onValueChange: vi.fn<() => void>() },
        {
          label: 'Layout',
          value: 'compact',
          options: [
            { value: 'regular', label: 'Regular' },
            { value: 'compact', label: 'Compact' },
          ],
          onValueChange: onLayoutChange,
        },
      ],
    };

    const items = nativeMenuItems(menu);

    items[2]?.choose();

    expect(
      nativeMenuSections(menu).map((section) => section.title),
    ).toStrictEqual([undefined, 'Layout']);
    expect(
      items.map(({ title, checked, divided }) => ({ title, checked, divided })),
    ).toStrictEqual([
      { title: scopes[0].label, checked: true, divided: undefined },
      { title: scopes[1].label, checked: false, divided: undefined },
      { title: 'Regular', checked: false, divided: true },
      { title: 'Compact', checked: true, divided: undefined },
    ]);
    expect(onLayoutChange).toHaveBeenCalledWith('regular');
  });

  it('lists actions as they are, running the one chosen', () => {
    const squash = vi.fn<() => void>();

    const items = nativeMenuItems({
      actions: [{ label: 'Squash and merge', onPress: squash }],
    });

    items[0]?.choose();

    expect(items.map((item) => item.title)).toStrictEqual(['Squash and merge']);
    expect(items[0]?.checked).toBeUndefined();
    expect(squash).toHaveBeenCalledTimes(1);
  });
});
