import type { z } from 'zod';

type JsonSchema = z.core.JSONSchema.JSONSchema;

type JsonSchemaNode = z.core.JSONSchema._JSONSchema;

export type JsonValue = JsonSchema['const'];

/*
 * A prop's type, read off its JSON Schema and left unrendered. Two readers
 * spell the same type differently — a props table wants `'sm' | 'md'`, the
 * Plugin reference wants `` `sm`, `md` `` — so the walk lives here once and
 * each reader keeps only its own spelling.
 */
export type SchemaType =
  | { kind: 'literal'; value: JsonValue }
  | { kind: 'choice'; values: JsonValue[] }
  | { kind: 'union'; members: SchemaType[] }
  | { kind: 'conjunction'; members: SchemaType[] }
  | { kind: 'array'; items: SchemaType[] }
  | { kind: 'action'; name: string }
  | { kind: 'named'; name: string }
  | { kind: 'primitive'; names: string[] }
  | { kind: 'unknown' }
  | { kind: 'never' };

function literal(schema: JsonSchema): SchemaType | undefined {
  return schema.const === undefined
    ? undefined
    : { kind: 'literal', value: schema.const };
}

function choice(schema: JsonSchema): SchemaType | undefined {
  return schema.enum && { kind: 'choice', values: schema.enum };
}

function union(schema: JsonSchema): SchemaType | undefined {
  const members = schema.anyOf ?? schema.oneOf;

  return members && { kind: 'union', members: members.map(schemaType) };
}

function conjunction(schema: JsonSchema): SchemaType | undefined {
  const members = schema.allOf;

  return members && { kind: 'conjunction', members: members.map(schemaType) };
}

// An absent or rejected item schema leaves no members, which reads as unknown.
function itemTypes(items: JsonSchema['items']): SchemaType[] {
  if (Array.isArray(items)) return items.map(schemaType);

  return items ? [schemaType(items)] : [];
}

function array(schema: JsonSchema): SchemaType | undefined {
  if (schema.type !== 'array') return undefined;

  return { kind: 'array', items: itemTypes(schema.items) };
}

function constName(value: JsonValue): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function actionName(action: JsonSchemaNode | undefined): string | undefined {
  if (!action || typeof action === 'boolean') return undefined;

  return constName(action.const);
}

function action(schema: JsonSchema): SchemaType | undefined {
  const name = actionName(schema.properties?.action);

  return name === undefined ? undefined : { kind: 'action', name };
}

function event(schema: JsonSchema): SchemaType | undefined {
  return schema.properties?.$event === undefined
    ? undefined
    : { kind: 'named', name: 'Plugin event object' };
}

function namedObject(schema: JsonSchema): SchemaType {
  return action(schema) ?? event(schema) ?? { kind: 'named', name: 'object' };
}

function objectType(schema: JsonSchema): SchemaType | undefined {
  return schema.properties === undefined ? undefined : namedObject(schema);
}

function primitive(schema: JsonSchema): SchemaType | undefined {
  const { type } = schema;

  if (Array.isArray(type)) return { kind: 'primitive', names: type };

  return typeof type === 'string'
    ? { kind: 'primitive', names: [type] }
    : undefined;
}

// `x-argo-type` is the name a schema gives itself, and it outranks the walk.
function declaredType(schema: JsonSchema): SchemaType | undefined {
  const declared = schema['x-argo-type'];

  return typeof declared === 'string'
    ? { kind: 'named', name: declared }
    : undefined;
}

const READERS = [
  literal,
  choice,
  union,
  conjunction,
  array,
  objectType,
  primitive,
];

function firstMatch(schema: JsonSchema): SchemaType | undefined {
  for (const reader of READERS) {
    const type = reader(schema);

    if (type) return type;
  }

  return undefined;
}

function readType(schema: JsonSchema): SchemaType {
  return declaredType(schema) ?? firstMatch(schema) ?? { kind: 'unknown' };
}

// A boolean schema accepts anything or nothing at all.
function booleanType(accepted: boolean): SchemaType {
  return accepted ? { kind: 'unknown' } : { kind: 'never' };
}

export function schemaType(node: JsonSchemaNode): SchemaType {
  if (typeof node === 'boolean') return booleanType(node);

  return readType(node);
}
