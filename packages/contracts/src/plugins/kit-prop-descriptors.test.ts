import { describe, expect, it } from 'vitest';
import {
  type KitPartName,
  type KitPropDescriptor,
  kitPropDescriptors,
} from './kit-prop-descriptors';

function prop(part: KitPartName, name: string): KitPropDescriptor {
  const found = kitPropDescriptors(part).find((it) => it.name === name);

  if (!found) throw new Error(`${part} has no ${name} prop`);

  return found;
}

describe('a kit prop descriptor', () => {
  it.each([
    [
      'a choice',
      { part: 'Button', name: 'variant' },
      "'default' | 'outline' | 'secondary' | 'ghost' | 'link'",
    ],
    ['a scalar', { part: 'Button', name: 'label' }, 'string'],
    ['a schema that names itself', { part: 'List', name: 'items' }, 'Item[]'],
    [
      'a handler',
      { part: 'List', name: 'renderItem' },
      '(item, index) => node',
    ],
  ] as const)('spells %s', (_, target, type) => {
    expect(prop(target.part, target.name).type).toBe(type);
  });

  it('offers a choice prop its values, in schema order', () => {
    expect(prop('Button', 'size').options).toEqual(['xs', 'sm', 'md', 'lg']);
  });

  it('leaves a free field without options', () => {
    expect(prop('Button', 'label').options).toBeUndefined();
  });

  it('lists the alternatives of a union, so no reader splits the type back apart', () => {
    const { members, type } = prop('Button', 'onPress');

    expect(members.length).toBeGreaterThan(1);
    expect(members.join(' | ')).toBe(type);
  });

  it('marks a prop the schema requires', () => {
    expect(prop('Button', 'label').required).toBe(true);
    expect(prop('Button', 'variant').required).toBe(false);
  });

  it("carries the schema's own description", () => {
    expect(prop('List', 'layout').description).toBeTypeOf('string');
  });
});

describe('a kit prop default', () => {
  it.each([
    ['Button', 'variant', "'default'"],
    ['Button', 'size', "'md'"],
    ['IconButton', 'size', "'sm'"],
    ['IconButton', 'variant', "'default'"],
    ['Text', 'role', "'body'"],
  ] as const)('reads %s %s as %s', (part, name, defaultValue) => {
    expect(prop(part, name).defaultValue).toBe(defaultValue);
  });

  it('is absent where the schema declares none', () => {
    expect(prop('Button', 'label').defaultValue).toBeUndefined();
  });
});

describe('a list stepper default', () => {
  it('reads the step as 1', () => {
    expect(prop('ListItem.Stepper', 'step').defaultValue).toBe('1');
  });
});
