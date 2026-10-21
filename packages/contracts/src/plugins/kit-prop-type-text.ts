import type { z } from 'zod';
import type { JsonValue, SchemaType } from './schema-type';

type JsonSchema = z.core.JSONSchema.JSONSchema;

/*
 * A prop's type in TypeScript's own spelling, the one a props table reader
 * expects: `'sm' | 'md'`, `string`, `Item[]`. The Plugin reference spells the
 * same `SchemaType` its own way; only the spelling differs, never the walk.
 */
// A default can hold any JSON, not only the scalars a `const` holds.
type SpelledValue = JsonValue | NonNullable<JsonSchema['default']>;

export function literal(value: SpelledValue): string {
  return typeof value === 'string' ? `'${value}'` : JSON.stringify(value);
}

function literalText(type: SchemaType): string | undefined {
  if (type.kind === 'literal') return literal(type.value);

  if (type.kind === 'choice') return type.values.map(literal).join(' | ');

  return undefined;
}

function membersText(type: SchemaType): string | undefined {
  if (type.kind === 'union')
    return [...new Set(type.members.map(typeText))].join(' | ');

  if (type.kind === 'conjunction')
    return type.members.map(typeText).join(' & ');

  return undefined;
}

function nameText(type: SchemaType): string | undefined {
  if (type.kind === 'action') return `${literal(type.name)} action object`;

  if (type.kind === 'named') return type.name;

  return undefined;
}

function itemsText(items: SchemaType[]): string {
  if (items.length === 0) return 'unknown';

  return items.map(typeText).join(' | ');
}

function listText(type: SchemaType): string | undefined {
  if (type.kind === 'array') return `${itemsText(type.items)}[]`;

  if (type.kind === 'primitive') return type.names.join(' | ');

  return undefined;
}

function emptyText(type: SchemaType): string {
  return type.kind === 'never' ? 'never' : 'unknown';
}

function namedText(type: SchemaType): string | undefined {
  return literalText(type) ?? membersText(type) ?? nameText(type);
}

export function typeText(type: SchemaType): string {
  return namedText(type) ?? listText(type) ?? emptyText(type);
}

// A union of unions reads as one list of alternatives, so flatten as we go.
function unionTexts(type: SchemaType): string[] {
  if (type.kind === 'union') return type.members.flatMap(unionTexts);

  if (type.kind === 'choice') return type.values.map(literal);

  return [typeText(type)];
}

// The alternatives a reader can scan, so nobody has to split `type` back apart.
export function memberTexts(type: SchemaType): string[] {
  return [...new Set(unionTexts(type))];
}
