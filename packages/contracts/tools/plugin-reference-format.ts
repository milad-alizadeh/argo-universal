import type { z } from 'zod';
import { partObjectSchema } from '../src/plugins/plugin-object-schema';
import { pluginPartSchemas } from '../src/plugins/plugin-part-schemas';
import { type SchemaType, schemaType } from '../src/plugins/schema-type';
import { wireParts, type WirePartDefinition } from '../src/plugins/wire-parts';

type JsonSchema = z.core.JSONSchema.JSONSchema;

type JsonSchemaNode = z.core.JSONSchema._JSONSchema;

const jsonValueDescription = 'JSON value';

const referenceParts = { ...pluginPartSchemas, ...wireParts };

const schemas: Record<string, JsonSchema> = Object.fromEntries(
  Object.entries(referenceParts).map(([name, part]) => [
    name,
    partObjectSchema(part),
  ]),
);

export function partDefinition(name: string): WirePartDefinition {
  const part = Object.entries(referenceParts).find(
    ([partName]) => partName === name,
  )?.[1];

  if (!part) throw new Error(`Missing Plugin part schema: ${name}`);

  return part;
}

export function propsSchema(name: string): JsonSchema {
  const schema = schemas[name];

  if (!schema) throw new Error(`Missing props schema for Plugin part ${name}`);

  return schema;
}

function literalText(type: SchemaType): string | undefined {
  if (type.kind === 'literal') return JSON.stringify(type.value);

  if (type.kind === 'choice')
    return type.values.map((item) => `\`${String(item)}\``).join(', ');

  return undefined;
}

function membersText(type: SchemaType): string | undefined {
  if (type.kind === 'union')
    return [...new Set(type.members.map(markdownType))].join(' or ');

  if (type.kind === 'conjunction')
    return type.members.map(markdownType).join(' and ');

  return undefined;
}

function nameText(type: SchemaType): string | undefined {
  if (type.kind === 'action') return `\`${type.name}\` action object`;

  if (type.kind === 'named') return type.name;

  return undefined;
}

function itemsText(items: SchemaType[]): string {
  if (items.length === 0) return jsonValueDescription;

  return items.map(markdownType).join(' or ');
}

function listText(type: SchemaType): string | undefined {
  if (type.kind === 'array') return `${itemsText(type.items)}[]`;

  if (type.kind === 'primitive') return type.names.join(' or ');

  return undefined;
}

function emptyText(type: SchemaType): string {
  return type.kind === 'never' ? 'never' : jsonValueDescription;
}

function namedText(type: SchemaType): string | undefined {
  return literalText(type) ?? membersText(type) ?? nameText(type);
}

function markdownType(type: SchemaType): string {
  return namedText(type) ?? listText(type) ?? emptyText(type);
}

function schemaNodeType(schema: JsonSchemaNode): string {
  return markdownType(schemaType(schema));
}

function escapeCell(value: string): string {
  return value.replaceAll('|', '\\|').replaceAll('\n', ' ');
}

function propRow(
  property: string,
  schema: JsonSchemaNode,
  required: ReadonlySet<string>,
): string {
  return `| \`${property}\` | ${propertyRequirement(property, required)} | ${schemaNodeType(schema)} | ${escapeCell(propDescription(schema))} |`;
}

function propertyRequirement(
  property: string,
  required: ReadonlySet<string>,
): string {
  return required.has(property) ? 'Required' : 'Optional';
}

function propDescription(schema: JsonSchemaNode): string {
  if (typeof schema === 'boolean') return 'This prop is not accepted.';

  return schema.description ?? 'No additional description.';
}

function propsTableRows(rows: string[]): string {
  return [
    '| Prop | Requirement | Type | Description |',
    '| --- | --- | --- | --- |',
    ...rows,
    '',
  ].join('\n');
}

function propertyRows(schema: JsonSchema): string[] {
  const properties = Object.entries(schema.properties ?? {});
  const required = new Set(schema.required ?? []);

  return properties.map(([property, prop]) =>
    propRow(property, prop, required),
  );
}

export function propsTable(name: string): string {
  const rows = propertyRows(propsSchema(name));

  return rows.length
    ? propsTableRows(rows)
    : 'This part has no serialized props.\n';
}
