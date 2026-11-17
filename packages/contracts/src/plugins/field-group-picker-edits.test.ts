import { describe, expect, it } from 'vitest';
import { kitComponent } from './kit';

const labels = {
  title: 'Labels',
  value: ['bug'],
  presentation: 'page',
  multiple: true,
  searchable: true,
  createLabel: 'Create label',
  options: [{ value: 'bug', label: 'bug' }],
};

describe('a FieldGroup row a Plugin edits', () => {
  it('takes a multiple Picker that creates its options and reports no list', () => {
    expect(kitComponent('FieldGroup.Picker')?.props.parse(labels)).toEqual(
      labels,
    );
  });

  it('takes a Value with a state dot before its words', () => {
    const status = { title: 'Status', value: 'Open', dot: 'success' };

    expect(kitComponent('FieldGroup.Value')?.props.parse(status)).toEqual(
      status,
    );
  });

  it('refuses a dot of no tone', () => {
    const status = { title: 'Status', value: 'Open', dot: 'red' };

    expect(
      kitComponent('FieldGroup.Value')?.props.safeParse(status).success,
    ).toBe(false);
  });
});
