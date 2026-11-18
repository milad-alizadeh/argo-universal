import type { ElicitationSchema } from '@repo/contracts';
import { describe, expect, it } from 'vitest';
import { elicitationPages } from './elicitation-pages';
import { createElicitationSchema } from './elicitation-schema';

const pages = (properties: ElicitationSchema['properties']): string[][] =>
  elicitationPages(createElicitationSchema({ properties }).fields).map((page) =>
    page.map((entry) => entry.name),
  );

describe('Elicitation pages', () => {
  it('keeps a named Other with its choice even when listed first', () => {
    expect(
      pages({
        first_other: { type: 'string', title: 'Other' },
        first: { type: 'string', enum: ['A', 'B'] },
        second: { type: 'string', minLength: 3 },
      }),
    ).toEqual([['first', 'first_other'], ['second']]);
  });

  it('pairs each Other with its own question', () => {
    expect(
      pages({
        first: { type: 'string', enum: ['A', 'B'] },
        second: { type: 'string', oneOf: [{ const: 'C', title: 'C' }] },
        second_other: { type: 'string', title: 'Other' },
        first_other: { type: 'string', title: 'Other' },
      }),
    ).toEqual([
      ['first', 'first_other'],
      ['second', 'second_other'],
    ]);
  });

  it('keeps unrelated text, numbers and toggles on separate pages', () => {
    expect(
      pages({
        choice: { type: 'string', enum: ['A'] },
        detail: { type: 'string' },
        count: { type: 'integer', minimum: 1 },
        enabled: { type: 'boolean' },
      }),
    ).toEqual([['choice'], ['detail'], ['count'], ['enabled']]);
  });

  it('groups an unqualified Other only when there is one choice', () => {
    expect(
      pages({
        other: { type: 'string', title: 'Other' },
        choice: { type: 'string', enum: ['A'] },
      }),
    ).toEqual([['choice', 'other']]);
  });

  it('does not guess the owner of an ambiguous Other', () => {
    expect(
      pages({
        first: { type: 'string', enum: ['A'] },
        other: { type: 'string', title: 'Other' },
        second: { type: 'string', enum: ['B'] },
      }),
    ).toEqual([['first'], ['other'], ['second']]);
  });
});
