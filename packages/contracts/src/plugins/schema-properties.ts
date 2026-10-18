import { z } from 'zod';

export function schemaProperties(
  schema: z.core.$ZodType,
): z.ZodObject['shape'] {
  if (schema instanceof z.ZodObject) return schema.shape;

  if (schema instanceof z.ZodUnion)
    return Object.assign({}, ...schema.options.map(schemaProperties));

  return {};
}
