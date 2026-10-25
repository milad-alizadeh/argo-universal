import { describe, expect, it, vi } from 'vitest';
import { pickerKind, type PickerKind } from './field-picker-kind';
import {
  choiceSummary,
  matchingOptions,
  narrowed,
  optionSections,
  type FieldPickerOption,
  type FieldPickerProps,
} from './field-picker-model';

const options: FieldPickerOption[] = [
  { value: 'a', label: 'Alpha', section: 'Recent' },
  { value: 'b', label: 'Beta', subtitle: 'second' },
  { value: 'c', label: 'Gamma', section: 'Recent' },
];

type Heard = (value: string | readonly string[]) => void;

const base = { title: 'Picker', presentation: 'menu' } as const;

const values = (list: readonly FieldPickerOption[]): string[] =>
  list.map((option) => option.value);

describe('choiceSummary', () => {
  it('names the chosen options in the options’ order', () => {
    expect(choiceSummary({ options, held: ['c', 'a'] })).toBe('Alpha, Gamma');
    expect(choiceSummary({ options, held: ['b'] })).toBe('Beta');
  });
});

const heard = (): Heard => vi.fn<Heard>();

describe('pick', () => {
  it('reports the one value of a single choice', () => {
    const onValueChange = heard();

    narrowed({ ...base, options, value: 'a', onValueChange }).pick('b');

    expect(onValueChange).toHaveBeenCalledWith('b');
  });

  it('reports the whole list of a multiple choice in the options’ order, toggling the value', () => {
    const onValueChange = heard();
    const props = { ...base, options, multiple: true, onValueChange };

    narrowed({ ...props, value: ['c'] }).pick('a');
    narrowed({ ...props, value: ['a', 'c'] }).pick('c');

    expect(onValueChange).toHaveBeenNthCalledWith(1, ['a', 'c']);
    expect(onValueChange).toHaveBeenNthCalledWith(2, ['a']);
  });

  it('holds a Plugin’s string value as a one-item list, and its list as it is', () => {
    const wide = { ...base, options, onValueChange: heard() };
    const list = narrowed({ ...wide, value: ['a', 'c'], multiple: true });

    expect(narrowed({ ...wide, value: 'b' }).held).toStrictEqual(['b']);
    expect(list.held).toStrictEqual(['a', 'c']);
  });

  it('drops a payload that is not the caller’s kind, silently', () => {
    const onValueChange = heard();
    const single = narrowed({ ...base, options, value: 'a', onValueChange });

    const multiple = narrowed({
      ...base,
      options,
      value: ['a'],
      multiple: true,
      onValueChange,
    });

    multiple.onValueChange('b');
    single.onValueChange(['b']);

    expect(onValueChange).not.toHaveBeenCalled();
  });
});

type Kind = [
  FieldPickerProps['presentation'],
  boolean,
  FieldPickerProps['trigger'],
  boolean,
  PickerKind,
];

const kinds: Kind[] = [
  ['menu', false, 'row', true, 'menu'],
  ['menu', false, undefined, false, 'menu'],
  ['menu', true, 'row', true, 'menu'],
  ['menu', true, 'row', false, 'page'],
  ['page', false, 'row', true, 'page'],
  ['page', true, 'row', true, 'page'],
  ['inline', false, 'row', false, 'inline'],
  ['inline', true, 'row', true, 'inline'],
  ['menu', false, 'pill', true, 'pill'],
  ['page', true, 'pill', false, 'pill'],
  ['inline', false, 'pill', true, 'pill'],
];

describe('pickerKind', () => {
  it.each(kinds)('%s, multiple %s, trigger %s, holds %s is %s', (...row) => {
    const [presentation, multiple, trigger, holds, kind] = row;

    expect(pickerKind(presentation, multiple, trigger, holds)).toBe(kind);
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

  it('gives a section titled with an empty string a key of its own', () => {
    const keys = optionSections([
      { value: 'a', label: 'A', section: '' },
      { value: 'b', label: 'B' },
    ]).map((section) => section.key);

    expect(new Set(keys).size).toBe(2);
  });
});

describe('matchingOptions', () => {
  it('matches label or subtitle without regard to case', () => {
    expect(values(matchingOptions(options, ' GAM '))).toStrictEqual(['c']);
    expect(values(matchingOptions(options, 'SECOND'))).toStrictEqual(['b']);
    expect(matchingOptions(options, 'zzz')).toStrictEqual([]);
  });
});
