import { z } from 'zod';

type PerSizeClass<Schema extends z.ZodType> = z.ZodUnion<
  readonly [
    Schema,
    z.ZodObject<{
      compact: Schema;
      medium: z.ZodOptional<Schema>;
      wide: Schema;
    }>,
  ]
>;

export function perSizeClass<Schema extends z.ZodType>(
  schema: Schema,
): PerSizeClass<Schema> {
  return z.union([
    schema,
    z.object({ compact: schema, medium: schema.optional(), wide: schema }),
  ]);
}
