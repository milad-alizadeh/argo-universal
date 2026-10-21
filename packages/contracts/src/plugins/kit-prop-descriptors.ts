import type { z } from 'zod';
import { partObjectSchema } from './plugin-object-schema';
import { pluginPartSchemas } from './plugin-part-schemas';

type JsonSchema = z.core.JSONSchema.JSONSchema;

type SchemaNode = z.core.JSONSchema._JSONSchema;

type JsonValue = JsonSchema['const'];

export type KitPartName = keyof typeof pluginPartSchemas;

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
  // The prop's whole type, as a reader reads it: `'sm' | 'md'`, `string`, `boolean`.
  type: string;
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

function literal(value: JsonValue): string {
  return typeof value === 'string' ? `'${value}'` : JSON.stringify(value);
}

function unionMembers(schema: JsonSchema): SchemaNode[] | undefined {
  return schema.anyOf ?? schema.oneOf;
}

function constType(schema: JsonSchema): string | undefined {
  return schema.const === undefined ? undefined : literal(schema.const);
}

function enumType(schema: JsonSchema): string | undefined {
  return schema.enum?.map(literal).join(' | ');
}

function unionType(schema: JsonSchema): string | undefined {
  const members = unionMembers(schema);

  return members && [...new Set(members.map(nodeType))].join(' | ');
}

function plainType(schema: JsonSchema): string {
  return typeof schema.type === 'string' ? schema.type : 'unknown';
}

function namedType(schema: JsonSchema): string | undefined {
  return constType(schema) ?? enumType(schema);
}

function typeName(schema: JsonSchema): string {
  return namedType(schema) ?? unionType(schema) ?? plainType(schema);
}

function nodeType(node: SchemaNode): string {
  return typeof node === 'boolean' ? 'unknown' : typeName(node);
}

function constChoice(schema: JsonSchema): string[] | undefined {
  return schema.const === undefined ? undefined : [String(schema.const)];
}

function stringValues(values: JsonValue[]): string[] | undefined {
  return values.every((value) => typeof value === 'string')
    ? values.map(String)
    : undefined;
}

function enumChoice(schema: JsonSchema): string[] | undefined {
  return schema.enum && stringValues(schema.enum);
}

function unionChoice(schema: JsonSchema): string[] | undefined {
  const members = unionMembers(schema);

  return (
    members &&
    stringValues(
      members.map((node) =>
        typeof node === 'boolean' ? undefined : node.const,
      ),
    )
  );
}

// A prop a table can offer as a list of values, rather than a free field.
function choices(schema: JsonSchema): string[] | undefined {
  return constChoice(schema) ?? enumChoice(schema) ?? unionChoice(schema);
}

function kindOf(schema: JsonSchema): KitPropKind {
  if (choices(schema)) return 'choice';

  return SCALAR_KINDS.get(plainType(schema)) ?? 'opaque';
}

function schemaOf(node: SchemaNode): JsonSchema {
  return typeof node === 'boolean' ? {} : node;
}

function defaultType(schema: JsonSchema): string | undefined {
  const value = schema.default;

  if (value === undefined) return undefined;

  return typeof value === 'string' ? `'${value}'` : JSON.stringify(value);
}

function describe(
  name: string,
  schema: JsonSchema,
  required: boolean,
): KitPropDescriptor {
  return {
    name,
    description: schema.description,
    required,
    kind: kindOf(schema),
    type: typeName(schema),
    options: choices(schema),
    defaultValue: defaultType(schema),
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
    describe(prop, schemaOf(node), required.has(prop)),
  );
}

export function isKitPartName(name: string): name is KitPartName {
  return Object.hasOwn(pluginPartSchemas, name);
}
