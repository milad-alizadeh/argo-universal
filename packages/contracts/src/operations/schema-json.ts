import { z } from 'zod';

export const OperationSchemaRepresentation = z.record(z.string(), z.json());

export const operationSchemaJson =
  z.registry<z.infer<typeof OperationSchemaRepresentation>>();

// Schemas an Operation's description names in one line instead of spelling out, such as a Plugin manifest; validation still uses the whole schema.
export const operationSchemaSummary =
  z.registry<z.infer<typeof OperationSchemaRepresentation>>();

type Overriding = Parameters<
  NonNullable<NonNullable<Parameters<typeof z.toJSONSchema>[1]>['override']>
>[0];

// Replaces a summarised schema's JSON with its one-line summary, in place, as zod's override expects.
const summarised = ({ zodSchema, jsonSchema }: Overriding): void => {
  const summary = operationSchemaSummary.get(zodSchema);

  if (!summary) return;

  for (const key of Object.keys(jsonSchema))
    Reflect.deleteProperty(jsonSchema, key);
  Object.assign(jsonSchema, summary);
};

// The schema as a caller reads it (`input`, where a defaulted field may be left out) or as it is answered (`output`).
export function operationJsonSchema(
  schema: z.ZodType,
  io: 'input' | 'output' = 'output',
): z.core.JSONSchema.JSONSchema {
  return z.toJSONSchema(schema, {
    target: 'draft-7',
    io,
    override: summarised,
    unrepresentable: ({ zodSchema, message }) => {
      const representation = operationSchemaJson.get(zodSchema);

      if (!representation) throw new Error(message);

      return representation;
    },
  });
}
