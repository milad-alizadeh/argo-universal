import { describe, expect, it } from 'vitest';
import { wirePart } from './kit';

describe('Metadata fields', () => {
  it.each([
    { kind: 'text', text: '~/Developer/argo', icon: 'computer' },
    { kind: 'pills', pills: [{ text: 'bug', tone: 'danger' }] },
    { kind: 'status', text: 'Passed', tone: 'success' },
  ])('accepts a $kind value', (value) => {
    const fields = { rows: [{ title: 'Field', value }] };
    expect(wirePart('Metadata')?.props.parse(fields)).toEqual(fields);
  });

  it.each([
    { kind: 'link', text: 'Docs', href: 'https://example.com' },
    { kind: 'status', text: 'Passed', tone: 'not-a-tone' },
    { kind: 'pills', pills: [{ text: 12 }] },
    { kind: 'text', text: 12 },
  ])('rejects an unsupported or malformed value %#', (value) => {
    expect(
      wirePart('Metadata')?.props.safeParse({
        rows: [{ title: 'Field', value }],
      }).success,
    ).toBe(false);
  });
});
