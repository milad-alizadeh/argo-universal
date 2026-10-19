import { visualSchemas } from '@repo/contracts/plugins/visual-props';
import type { WireNode } from '@repo/contracts/plugins/wire';
import type { z } from 'zod';

export { visualSchemas } from '@repo/contracts/plugins/visual-props';

export function visualPropsReason(
  type: string,
  props: WireNode['props'],
  partial?: boolean,
): string | undefined {
  const schema = visualSchemas.get(type);

  if (!schema) return;

  return parseProps(props, partial ? schema.partial() : schema);
}

function parseProps(
  props: WireNode['props'],
  schema: z.ZodObject,
): string | undefined {
  const result = schema.safeParse(props);

  return result.error?.issues
    .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
    .join('; ');
}
