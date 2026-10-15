import { describe, expect, it, vi } from 'vitest';
import { nativeMenuItems } from './menu-native-items';

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
