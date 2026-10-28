import { z } from 'zod';

export const OperationSchemaRepresentation = z.record(z.string(), z.json());

export const operationSchemaJson =
  z.registry<z.infer<typeof OperationSchemaRepresentation>>();

export function operationJsonSchema(
  schema: z.ZodType,
): z.core.JSONSchema.JSONSchema {
  return z.toJSONSchema(schema, {
    target: 'draft-7',
    unrepresentable: ({ zodSchema, message }) => {
      const representation = operationSchemaJson.get(zodSchema);

      if (!representation) throw new Error(message);

      return representation;
    },
  });
}
