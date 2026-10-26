import { describe, expect, it } from 'vitest';
import {
  SelectionRange,
  selectWebRow,
  toggleSelected,
  type SelectionInput,
} from './list-selection-model';

const ids = ['a', 'b', 'c', 'd'];

const plain = { range: false, toggle: false };

const shift = { range: true, toggle: false };

const meta = { range: false, toggle: true };

class Selecting implements SelectionInput {
  public ids = ids;

  public selected: readonly string[];

  public range = new SelectionRange();

  public constructor(selected: readonly string[] = []) {
    this.selected = selected;
  }

  public change = (next: readonly string[]): void => {
    this.selected = next;
  };
}

describe('SelectionRange', () => {
  it('chooses one row, replacing the selection', () => {
    const input = new Selecting(['d']);

    input.range.choose(input, 'b', plain);

    expect(input.selected).toEqual(['b']);
  });

  it('toggles a row on and off with the toggle key', () => {
    const input = new Selecting(['a']);

    input.range.choose(input, 'c', meta);
    expect(input.selected).toEqual(['a', 'c']);

    input.range.choose(input, 'a', meta);
    expect(input.selected).toEqual(['c']);
  });

  it('extends from the anchor to the pressed row in either direction', () => {
    const input = new Selecting();

    input.range.choose(input, 'c', plain);
    input.range.choose(input, 'a', shift);

    expect(new Set(input.selected)).toEqual(new Set(['a', 'b', 'c']));
  });

  it('keeps rows already selected when a range extends', () => {
    const input = new Selecting(['d']);

    input.range.choose(input, 'a', meta);
    input.range.choose(input, 'b', shift);

    expect(new Set(input.selected)).toEqual(new Set(['a', 'b', 'd']));
  });

  it('treats a range without an anchor as a plain choice', () => {
    const input = new Selecting();

    input.range.choose(input, 'b', shift);

    expect(input.selected).toEqual(['b']);
  });
});

describe('toggleSelected', () => {
  it('adds an id that is not selected and removes one that is', () => {
    const input = new Selecting(['a']);

    toggleSelected(input, 'b');
    expect(input.selected).toEqual(['a', 'b']);

    toggleSelected(input, 'a');
    expect(input.selected).toEqual(['b']);
  });
});

describe('selectWebRow', () => {
  it('activates a row that has a destination, clearing the selection', () => {
    const input = new Selecting(['a']);
    const activated: string[] = [];

    selectWebRow(input, input.range, {
      id: 'b',
      activate: () => activated.push('b'),
    });

    expect(activated).toEqual(['b']);
    expect(input.selected).toEqual([]);
  });

  it('chooses a row that has no destination', () => {
    const input = new Selecting();

    selectWebRow(input, input.range, { id: 'c' });

    expect(input.selected).toEqual(['c']);
  });
});
