import type { KitPart } from '@repo/contracts/kit-props';
import {
  type KitPropDescriptor,
  type KitPropKind,
  kitPropDescriptors,
} from '@repo/contracts/plugins/kit-prop-descriptors';
import type { ArgTypes } from '@storybook/react-native-web-vite';

type Control = 'text' | 'number' | 'boolean' | 'select' | false;

const CONTROLS = new Map<KitPropKind, Control>([
  ['text', 'text'],
  ['number', 'number'],
  ['boolean', 'boolean'],
  ['choice', 'select'],
  ['opaque', false],
]);

const SCALAR_TYPES = new Map<KitPropKind, 'string' | 'number' | 'boolean'>([
  ['text', 'string'],
  ['number', 'number'],
  ['boolean', 'boolean'],
]);

// A long union (every icon name) reads as noise in a table; the control still lists them all.
const SUMMARY_MEMBERS = 8;

function summary(prop: KitPropDescriptor): string {
  const { members } = prop;

  if (members.length <= SUMMARY_MEMBERS) return prop.type;

  return `${members.slice(0, SUMMARY_MEMBERS).join(' | ')} | … (${members.length} values)`;
}

function otherType(prop: KitPropDescriptor): ArgTypes[string]['type'] {
  return { name: 'other', value: prop.type, required: prop.required };
}

function enumType(prop: KitPropDescriptor): ArgTypes[string]['type'] {
  return { name: 'enum', value: prop.options ?? [], required: prop.required };
}

function choiceType(prop: KitPropDescriptor): ArgTypes[string]['type'] {
  return prop.kind === 'choice' ? enumType(prop) : otherType(prop);
}

function sbType(prop: KitPropDescriptor): ArgTypes[string]['type'] {
  const scalar = SCALAR_TYPES.get(prop.kind);

  if (!scalar) return choiceType(prop);

  return { name: scalar, required: prop.required };
}

function defaultValue(
  prop: KitPropDescriptor,
): { summary: string } | undefined {
  return prop.defaultValue === undefined
    ? undefined
    : { summary: prop.defaultValue };
}

function argType(prop: KitPropDescriptor): ArgTypes[string] {
  return {
    description: prop.description,
    control: CONTROLS.get(prop.kind) ?? false,
    options: prop.options,
    table: {
      type: { summary: summary(prop) },
      defaultValue: defaultValue(prop),
    },
    type: sbType(prop),
  };
}

/*
 * The props table for a kit component, built from the Contracts schema that
 * defines its props. Docgen cannot read them: `KitProps<'Button'>` is a generic
 * mapped type over those schemas, and no docgen expands one.
 */
export function kitArgTypes(name: KitPart): ArgTypes {
  return argTypes(kitPropDescriptors(name));
}

function argTypes(props: KitPropDescriptor[]): ArgTypes {
  return Object.fromEntries(props.map((prop) => [prop.name, argType(prop)]));
}
