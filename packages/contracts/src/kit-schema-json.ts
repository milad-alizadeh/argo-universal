import { z } from 'zod';

export const kitSchemaJson = z.registry<z.core.JSONSchema.BaseSchema>();

// A custom validator must declare its JSON representation in the owning schema.
export function kitJsonSchema(schema: z.ZodType): z.core.JSONSchema.JSONSchema {
  return z.toJSONSchema(schema, {
    unrepresentable: ({ zodSchema, message }) => {
      const representation = kitSchemaJson.get(zodSchema);

      if (!representation) throw new Error(message);

      return representation;
    },
  });
}
