import type { z } from 'zod';
import { kitJsonSchema } from '../kit-schema-json';
import type { KitComponentDefinition } from './kit-component-definition';

type JsonSchema = z.core.JSONSchema.JSONSchema;

type SchemaNode = z.core.JSONSchema._JSONSchema;

function acceptsValue(schema: SchemaNode): boolean {
  return typeof schema === 'boolean' ? schema : schema.not === undefined;
}

function propertiesOf(
  schemas: JsonSchema[],
): NonNullable<JsonSchema['properties']> {
  const entries = schemas.flatMap((schema) =>
    Object.entries(schema.properties ?? {}),
  );

  return Object.fromEntries(entries.filter(([, value]) => acceptsValue(value)));
}

function objectSchemas(schema: JsonSchema): JsonSchema[] {
  const branches = schema.anyOf ?? schema.oneOf;

  if (!branches) return [schema];

  return branches.flatMap((branch) =>
    typeof branch === 'boolean' ? [] : objectSchemas(branch),
  );
}

function requiredProperties(branches: JsonSchema[]): string[] {
  return (branches[0]?.required ?? []).filter((prop) =>
    branches.every((branch) => branch.required?.includes(prop)),
  );
}

// Tables list the union of accepted fields; a field is required only in every branch.
function pluginObjectSchema(schema: z.ZodType): JsonSchema {
  const json = kitJsonSchema(schema);
  const branches = objectSchemas(json);

  return {
    ...json,
    properties: propertiesOf(branches),
    required: requiredProperties(branches),
  };
}

// A prop its schema leaves undescribed reads as its own name, so every row of a props table says something.
function describedProperty(name: string, schema: SchemaNode): SchemaNode {
  if (typeof schema === 'boolean' || schema.description) return schema;

  const words = name.replaceAll(/([a-z])([A-Z])/g, '$1 $2');

  return { ...schema, description: `${words} for this kit component.` };
}

function describedProperties(schema: JsonSchema): JsonSchema {
  const properties = Object.entries(schema.properties ?? {}).map(
    ([name, value]) => [name, describedProperty(name, value)],
  );

  return { ...schema, properties: Object.fromEntries(properties) };
}

export function componentObjectSchema(
  component: KitComponentDefinition,
): JsonSchema {
  const wire = describedProperties(pluginObjectSchema(component.props));

  if (!component.expansion) return wire;
  const expansion = pluginObjectSchema(component.expansion);

  return {
    ...wire,
    properties: { ...wire.properties, ...expansion.properties },
    required: [wire, expansion].flatMap((schema) => schema.required ?? []),
  };
}
