import { describe, expect, it, vi } from 'vitest';
import { actingButton, splitEnabled } from './split-button-acting';

describe('the native split', () => {
  it.each([
    { name: 'the split', split: true, button: false },
    { name: 'its button', split: false, button: true },
  ])('turns off when $name is disabled', ({ split, button }) => {
    const acting = actingButton({ label: 'Merge PR', disabled: button });

    expect(splitEnabled({ disabled: split }, acting)).toBe(false);
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
