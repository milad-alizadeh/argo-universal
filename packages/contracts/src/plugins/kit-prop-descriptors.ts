import type { z } from 'zod';
import { literal, memberTexts, typeText } from './kit-prop-type-text';
import { partObjectSchema } from './plugin-object-schema';
import { pluginPartGroups, pluginPartSchemas } from './plugin-part-schemas';
import { type JsonValue, type SchemaType, schemaType } from './schema-type';

type JsonSchema = z.core.JSONSchema.JSONSchema;

type SchemaNode = z.core.JSONSchema._JSONSchema;

export { pluginPartGroups, pluginPartSchemas };

export type KitPartName = keyof typeof pluginPartSchemas;

// A name read from source, such as `KitProps<'Button'>`, checked against the schemas.
export const isKitPartName = (name: string): name is KitPartName =>
  Object.hasOwn(pluginPartSchemas, name);

/*
 * What a reader can set from a props table. A prop whose value is an object or a
 * handler is `opaque`: the table shows its type and leaves it alone.
 */
export type KitPropKind = 'text' | 'number' | 'boolean' | 'choice' | 'opaque';

export type KitPropDescriptor = {
  name: string;
  description: string | undefined;
  required: boolean;
  kind: KitPropKind;
  // The prop's whole type, as a reader reads it: `'sm' | 'md'`, `string`, `Item[]`.
  type: string;
  // The alternatives `type` is made of; one entry where the type is not a union.
  members: string[];
  // The values a `choice` prop takes, in schema order.
  options: string[] | undefined;
  defaultValue: string | undefined;
};

const SCALAR_KINDS = new Map<string, KitPropKind>([
  ['boolean', 'boolean'],
  ['integer', 'number'],
  ['number', 'number'],
  ['string', 'text'],
]);

function literalValues(members: SchemaType[]): JsonValue[] {
  return members.flatMap((member) =>
    member.kind === 'literal' ? [member.value] : [],
  );
}

// One member that is not a literal makes the whole union a free field.
function unionValues(members: SchemaType[]): JsonValue[] | undefined {
  const values = literalValues(members);

  return values.length === members.length ? values : undefined;
}

function singleValues(type: SchemaType): JsonValue[] | undefined {
  if (type.kind === 'literal') return [type.value];

  if (type.kind === 'choice') return type.values;

  return undefined;
}

function choiceValues(type: SchemaType): JsonValue[] | undefined {
  if (type.kind === 'union') return unionValues(type.members);

  return singleValues(type);
}

function stringValues(values: JsonValue[]): string[] | undefined {
  return values.every((value) => typeof value === 'string')
    ? values.map(String)
    : undefined;
}

// A prop a table can offer as a list of values, rather than a free field.
function choices(type: SchemaType): string[] | undefined {
  const values = choiceValues(type);

  return values && stringValues(values);
}

function scalarKind(type: SchemaType): KitPropKind | undefined {
  if (type.kind !== 'primitive' || type.names.length !== 1) return undefined;

  return SCALAR_KINDS.get(String(type.names[0]));
}

function kindOf(type: SchemaType, options: string[] | undefined): KitPropKind {
  if (options) return 'choice';

  return scalarKind(type) ?? 'opaque';
}

function propertySchema(node: SchemaNode): JsonSchema {
  return typeof node === 'boolean' ? {} : node;
}

function defaultLiteral(schema: JsonSchema): string | undefined {
  return schema.default === undefined ? undefined : literal(schema.default);
}

type DescribedType = Pick<
  KitPropDescriptor,
  'kind' | 'type' | 'members' | 'options'
>;

function describeType(
  type: SchemaType,
  options: string[] | undefined,
): DescribedType {
  return {
    kind: kindOf(type, options),
    type: typeText(type),
    members: memberTexts(type),
    options,
  };
}

function describe(
  name: string,
  schema: JsonSchema,
  required: boolean,
): KitPropDescriptor {
  const type = schemaType(schema);

  return {
    name,
    description: schema.description,
    required,
    ...describeType(type, choices(type)),
    defaultValue: defaultLiteral(schema),
  };
}

/*
 * Every prop a kit component declares, read from the Contracts schema that
 * defines it. The schema is the one definition of a kit component's props, so a
 * props table built from it cannot drift from the component.
 */
export function kitPropDescriptors(name: KitPartName): KitPropDescriptor[] {
  const schema = partObjectSchema(pluginPartSchemas[name]);
  const required = new Set(schema.required ?? []);

  return Object.entries(schema.properties ?? {}).map(([prop, node]) =>
    describe(prop, propertySchema(node), required.has(prop)),
  );
}
