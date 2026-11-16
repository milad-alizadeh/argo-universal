import { describe, expect, it, vi } from 'vitest';
import { narrowed, type FieldPickerOption } from './field-picker-model';
import { picksBetween, type PickReport } from './field-picker-pick';

const options: FieldPickerOption[] = [
  { value: 'a', label: 'Alpha' },
  { value: 'b', label: 'Beta' },
  { value: 'c', label: 'Gamma' },
];

const base = { title: 'Picker', presentation: 'menu', options } as const;

type Heard = (value: string | readonly string[]) => void;

// A multiple picker holding `value`, pressed on `pressed`; returns the spies.
type Spies = {
  onValueChange: ReturnType<typeof vi.fn<Heard>>;
  onPick: ReturnType<typeof vi.fn<(pick: PickReport) => void>>;
};

function press(value: string[], pressed: string): Spies {
  const onValueChange = vi.fn<Heard>();
  const onPick = vi.fn<(pick: PickReport) => void>();

  narrowed({ ...base, multiple: true, value, onValueChange, onPick }).pick(
    pressed,
  );

  return { onValueChange, onPick };
}

describe('onPick', () => {
  it('reports an add as on and a remove as off, with the same list as before', () => {
    const add = press(['c'], 'a');
    const remove = press(['a', 'c'], 'c');

    expect(add.onPick).toHaveBeenCalledWith({ value: 'a', on: true });
    expect(add.onValueChange).toHaveBeenCalledWith(['a', 'c']);
    expect(remove.onPick).toHaveBeenCalledWith({ value: 'c', on: false });
    expect(remove.onValueChange).toHaveBeenCalledWith(['a']);
  });

  it('names the pressed value for duplicate held values and a held value outside the options', () => {
    expect(press(['a', 'a'], 'a').onPick).toHaveBeenCalledWith({
      value: 'a',
      on: false,
    });
    expect(press(['gone', 'a'], 'b').onPick).toHaveBeenCalledWith({
      value: 'b',
      on: true,
    });
  });

  it('reports no pick for a single choice', () => {
    const onValueChange = vi.fn<Heard>();
    const picker = narrowed({ ...base, value: 'a', onValueChange });

    picker.pick('b');

    expect(picker.onPick).toBeUndefined();
    expect(onValueChange).toHaveBeenCalledWith('b');
  });
});

describe('picksBetween', () => {
  it('names each option whose choice differs from the held list, in the options’ order', () => {
    expect(picksBetween(['a', 'b'], options, ['c', 'b'])).toStrictEqual([
      { value: 'a', on: false },
      { value: 'c', on: true },
    ]);
    expect(picksBetween(['a'], options, ['a'])).toStrictEqual([]);
  });
});
