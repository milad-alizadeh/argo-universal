import { describe, expect, it } from 'vitest';
import { isStockIconName } from '../kit-symbols/stock-icon-schema';
import { fieldGroupKitParts } from './field-group-kit-props';
import { kitPropDescriptors } from './kit-prop-descriptors';

describe('a FieldGroup row’s leading icon', () => {
  it('takes a system symbol', () => {
    expect(isStockIconName('settings')).toBe(true);
  });

  it.each([
    ['Argo’s own symbol', 'agent'],
    ['an SVG icon', 'branch'],
    ['an unknown name', 'nope'],
  ])('refuses %s', (_, name) => {
    expect(isStockIconName(name)).toBe(false);
    expect(
      fieldGroupKitParts['FieldGroup.Picker'].props.safeParse({
        title: 'Volume',
        value: 'a',
        options: [],
        onValueChange: { $event: 'onValueChange' },
        leading: name,
      }).success,
    ).toBe(false);
  });
});

describe('a FieldGroup props table', () => {
  it('lists the field’s props with the required ones marked', () => {
    const props = kitPropDescriptors('FieldGroup.Toggle');

    expect(props.map(({ name, required }) => [name, required])).toStrictEqual([
      ['title', true],
      ['disabled', false],
      ['value', true],
      ['onValueChange', true],
    ]);
  });

  it('offers the leading icon as a choice of stock symbols', () => {
    const icon = kitPropDescriptors('FieldGroup.Picker').find(
      (prop) => prop.name === 'leading',
    );

    expect(icon?.options).toContain('settings');
    expect(icon?.options).not.toContain('agent');
  });
});
