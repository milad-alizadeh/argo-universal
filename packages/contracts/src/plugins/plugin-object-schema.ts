import type { z } from 'zod';
import { kitJsonSchema } from '../kit-schema-json';
import type { WirePartDefinition } from './wire-part-definition';

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
export function pluginObjectSchema(schema: z.ZodType): JsonSchema {
  const json = kitJsonSchema(schema);
  const branches = objectSchemas(json);

  return {
    ...json,
    properties: propertiesOf(branches),
    required: requiredProperties(branches),
  };
}

export function partObjectSchema(part: WirePartDefinition): JsonSchema {
  const wire = pluginObjectSchema(part.props);

  if (!part.expansion) return wire;
  const expansion = pluginObjectSchema(part.expansion);

  return {
    ...wire,
    properties: { ...wire.properties, ...expansion.properties },
    required: [wire, expansion].flatMap((schema) => schema.required ?? []),
  };
}
