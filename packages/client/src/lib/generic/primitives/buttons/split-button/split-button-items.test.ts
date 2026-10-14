import { createElement } from 'react';
import { describe, expect, it, vi } from 'vitest';
import {
  actingButton,
  nativeSplit,
  splitMenuItems,
} from './split-button-items';
import type { SplitActionProps } from './split-button-props';

// The acting button as the native split reads it; phones never render it.
function Action(_props: SplitActionProps): null {
  return null;
}

const scopes = [
  { value: 'once', label: 'Allow once' },
  { value: 'always', label: 'Always allow' },
] as const;

describe('the native split menu', () => {
  it('receives every option, with only the chosen one selected', () => {
    const items = splitMenuItems({
      options: scopes,
      value: 'always',
      onValueChange: vi.fn<(value: string) => void>(),
    });

    expect(
      items.map(({ label, selected }) => ({ label, selected })),
    ).toStrictEqual([
      { label: 'Allow once', selected: false },
      { label: 'Always allow', selected: true },
    ]);
  });

  it('reports the value of the option pressed', () => {
    const onValueChange = vi.fn<(value: string) => void>();

    splitMenuItems({
      options: scopes,
      value: 'always',
      onValueChange,
    })[0]?.onPress();

    expect(onValueChange).toHaveBeenCalledWith('once');
  });

  it('receives actions as they are, running the one pressed', () => {
    const squash = vi.fn<() => void>();

    const items = splitMenuItems({
      actions: [{ label: 'Squash and merge', onPress: squash }],
    });

    items[0]?.onPress();

    expect(items.map((item) => item.label)).toStrictEqual(['Squash and merge']);
    expect(items[0]?.selected).toBeUndefined();
    expect(squash).toHaveBeenCalledTimes(1);
  });
});

describe('the native split', () => {
  it.each([
    { name: 'the split', split: true, button: false },
    { name: 'its button', split: false, button: true },
  ])('turns off when $name is disabled', ({ split, button }) => {
    const native = nativeSplit({
      menuLabel: 'Merge options',
      disabled: split,
      actions: [],
      children: createElement(Action, { label: 'Merge PR', disabled: button }),
    });

    expect(native.enabled).toBe(false);
    expect(native.menuLabel).toBe('Merge options');
  });
});

describe('the native primary action', () => {
  it.each([
    { name: 'a label prop', props: { label: 'Merge PR' } },
    { name: 'text children', props: { children: 'Merge PR' } },
  ])('takes its name from $name and its press from the button', ({ props }) => {
    const onPress = vi.fn<() => void>();

    const acting = actingButton({ ...props, onPress, disabled: true });

    acting.onPress?.();

    expect(acting.label).toBe('Merge PR');
    expect(acting.disabled).toBe(true);
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
