import { describe, expect, it, vi } from 'vitest';
import {
  choiceSummary,
  choose,
  matchingOptions,
  optionSections,
  type FieldPickerOption,
} from './field-picker-model';

const options: FieldPickerOption[] = [
  { value: 'a', label: 'Alpha', section: 'Recent' },
  { value: 'b', label: 'Beta', subtitle: 'second' },
  { value: 'c', label: 'Gamma', section: 'Recent' },
];

const values = (list: readonly FieldPickerOption[]): string[] =>
  list.map((option) => option.value);

describe('choiceSummary', () => {
  it('names the chosen options in the options’ order', () => {
    expect(choiceSummary({ options, value: ['c', 'a'] })).toBe('Alpha, Gamma');
    expect(choiceSummary({ options, value: 'b' })).toBe('Beta');
  });
});

describe('choose', () => {
  it('reports the one value of a single choice', () => {
    const onValueChange = vi.fn<(value: string | readonly string[]) => void>();

    choose({ options, value: 'a', onValueChange }, 'b');

    expect(onValueChange).toHaveBeenCalledWith('b');
  });

  it('reports the whole list of a multiple choice, toggling the value', () => {
    const onValueChange = vi.fn<(value: string | readonly string[]) => void>();
    const props = { options, multiple: true, onValueChange };

    choose({ ...props, value: ['c'] }, 'a');
    choose({ ...props, value: ['a', 'c'] }, 'c');

    expect(onValueChange).toHaveBeenNthCalledWith(1, ['a', 'c']);
    expect(onValueChange).toHaveBeenNthCalledWith(2, ['a']);
  });
});

describe('optionSections', () => {
  it('groups options by section in the order the sections first appear', () => {
    const sections = optionSections(options);

    expect(sections.map((section) => section.title)).toStrictEqual([
      'Recent',
      undefined,
    ]);
    expect(sections.map((section) => values(section.options))).toStrictEqual([
      ['a', 'c'],
      ['b'],
    ]);
  });
});

describe('matchingOptions', () => {
  it('matches label or subtitle without regard to case', () => {
    expect(values(matchingOptions(options, ' GAM '))).toStrictEqual(['c']);
    expect(values(matchingOptions(options, 'SECOND'))).toStrictEqual(['b']);
    expect(matchingOptions(options, 'zzz')).toStrictEqual([]);
  });
});
