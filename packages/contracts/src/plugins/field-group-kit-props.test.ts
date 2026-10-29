import { describe, expect, it } from 'vitest';
import { isStockIconName } from '../kit-symbols/stock-icon-schema';
import { fieldGroupKitComponents } from './field-group-kit-props';
import { kitPropDescriptors } from './kit-prop-descriptors';

describe('a FieldGroup row’s leading icon', () => {
  it.each([
    ['a system symbol', 'settings'],
    ['Argo’s own symbol', 'agent'],
  ])('takes %s', (_, name) => {
    expect(isStockIconName(name)).toBe(true);
  });

  it.each([
    ['an SVG icon', 'branch'],
    ['an unknown name', 'nope'],
  ])('refuses %s', (_, name) => {
    expect(isStockIconName(name)).toBe(false);
    expect(
      fieldGroupKitComponents['FieldGroup.Picker'].props.safeParse({
        title: 'Volume',
        value: 'a',
        options: [],
        presentation: 'menu',
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
      ['id', false],
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

    expect(icon?.options).toContain('agent');
    expect(icon?.options).not.toContain('branch');
  });
});

const parseLogo = (logo: string): boolean =>
  fieldGroupKitComponents['FieldGroup.Picker'].props.safeParse({
    title: 'Agent',
    value: 'a',
    options: [{ value: 'a', label: 'A', logo }],
    presentation: 'menu',
    onValueChange: { $event: 'onValueChange' },
  }).success;

describe('a FieldGroup.Picker option’s logo', () => {
  it.each([
    ['inline SVG markup', '<svg xmlns="http://www.w3.org/2000/svg"></svg>'],
    ['padded inline SVG markup', '\n  <svg viewBox="0 0 1 1"/>'],
    ['an SVG data URI', 'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4='],
    ['an https URL', 'https://cdn.agentclientprotocol.com/a/icon.svg'],
  ])('takes %s', (_, logo) => {
    expect(parseLogo(logo)).toBe(true);
  });

  it.each([
    ['an http URL', 'http://example.com/a.svg'],
    ['a file URL', 'file:///etc/passwd'],
    ['a javascript URL', 'javascript:alert(1)'],
    ['a PNG data URI', 'data:image/png;base64,AAAA'],
    ['plain text', 'logo'],
    ['an empty string', ''],
    ['a longer one than the cap', `<svg>${'a'.repeat(100_000)}</svg>`],
  ])('refuses %s', (_, logo) => {
    expect(parseLogo(logo)).toBe(false);
  });
});
