import { describe, expect, it } from 'vitest';
import {
  matchReferences,
  type ReferenceOption,
  shortTitle,
} from './rich-textarea-references';

const options: ReferenceOption[] = [
  { number: 412, title: 'Spec 0010: Argo owns its primitives', state: 'done' },
  { number: 443, title: 'Composer editor: markdown shortcuts', state: 'open' },
  { number: 427, title: 'Composer sheet and configuration', state: 'open' },
];

const numbers = (found: ReferenceOption[]): number[] =>
  found.map((option) => option.number);

describe('matchReferences', () => {
  it('offers everything for a bare #, open first', () => {
    expect(numbers(matchReferences(options, ''))).toEqual([443, 427, 412]);
  });

  it('matches the start of a number', () => {
    expect(numbers(matchReferences(options, '44'))).toEqual([443]);
  });

  it('matches a title without regard to case', () => {
    expect(numbers(matchReferences(options, 'COMP'))).toEqual([443, 427]);
  });

  it('offers nothing for a query that matches none', () => {
    expect(matchReferences(options, 'zzz')).toEqual([]);
  });
});

describe('shortTitle', () => {
  it('keeps a short title', () => {
    expect(shortTitle('Fix the bug')).toBe('Fix the bug');
  });

  it('cuts a long title at 24 characters', () => {
    expect(shortTitle('Composer editor: markdown shortcuts')).toBe(
      'Composer editor: markdow…',
    );
  });
});
