import { z } from 'zod';
import { pluginPartSchemas } from '../src/plugins/plugin-part-schemas';
import type { WirePartDefinition } from '../src/plugins/wire-parts';

type JsonSchema = z.core.JSONSchema.JSONSchema;

type JsonSchemaNode = z.core.JSONSchema._JSONSchema;

const jsonValueDescription = 'JSON value';

const schemas: Record<string, JsonSchema> = Object.fromEntries(
  Object.entries(pluginPartSchemas).map(([name, part]) => [
    name,
    z.toJSONSchema(part.props, { unrepresentable: 'any' }),
  ]),
);

export function partDefinition(name: string): WirePartDefinition {
  const part = Object.entries(pluginPartSchemas).find(
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

function constantType(schema: JsonSchema): string | undefined {
  return schema.const === undefined ? undefined : JSON.stringify(schema.const);
}

function enumType(schema: JsonSchema): string | undefined {
  return schema.enum?.map((item) => `\`${String(item)}\``).join(', ');
}

function unionType(schema: JsonSchema): string | undefined {
  const union = schema.anyOf ?? schema.oneOf;

  if (!union) return undefined;

  return [...new Set(union.map(schemaNodeType))].join(' or ');
}

function schemaNodeType(schema: JsonSchemaNode): string {
  if (typeof schema !== 'boolean') return markdownType(schema);

  return schema ? jsonValueDescription : 'never';
}

function formatAction(action: JsonSchema['const']): string | undefined {
  return typeof action === 'string' ? `\`${action}\` action object` : undefined;
}

function actionObjectType(schema: JsonSchema): string | undefined {
  return actionHandlerType(schema.properties?.action);
}

function actionHandlerType(
  action: JsonSchemaNode | undefined,
): string | undefined {
  if (!action || typeof action === 'boolean') return undefined;

  return formatAction(action.const);
}

function eventObjectType(schema: JsonSchema): string | undefined {
  return schema.properties?.$event === undefined
    ? undefined
    : 'Plugin event object';
}

function genericObjectType(schema: JsonSchema): string | undefined {
  return schema.properties === undefined ? undefined : 'object';
}

function objectType(schema: JsonSchema): string | undefined {
  return (
    actionObjectType(schema) ??
    eventObjectType(schema) ??
    genericObjectType(schema)
  );
}

function conjunctionType(schema: JsonSchema): string | undefined {
  return schema.allOf?.map(schemaNodeType).join(' and ');
}

function arrayType(schema: JsonSchema): string | undefined {
  if (schema.type !== 'array') return undefined;

  return `${arrayItemType(schema.items)}[]`;
}

function arrayItemType(items: JsonSchema['items']): string {
  if (Array.isArray(items)) return items.map(schemaNodeType).join(' or ');

  return items ? schemaNodeType(items) : jsonValueDescription;
}

function typeList(schema: JsonSchema): string | undefined {
  return Array.isArray(schema.type) ? schema.type.join(' or ') : undefined;
}

function schemaTypeCandidates(schema: JsonSchema): (string | undefined)[] {
  return [
    constantType(schema),
    enumType(schema),
    unionType(schema),
    conjunctionType(schema),
    arrayType(schema),
    objectType(schema),
    typeList(schema),
    primitiveType(schema),
  ];
}

export function markdownType(schema: JsonSchema): string {
  return (
    schemaTypeCandidates(schema).find((candidate) => candidate !== undefined) ??
    jsonValueDescription
  );
}

function primitiveType(schema: JsonSchema): string | undefined {
  return typeof schema.type === 'string' ? schema.type : undefined;
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
