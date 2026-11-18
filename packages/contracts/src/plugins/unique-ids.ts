import { z } from 'zod';

// A list of ids, each at most once, as a manifest names its Slots, renders and Hooks.
export function uniqueIds<Id extends z.ZodType<string>>(
  id: Id,
  message: string,
): z.ZodArray<Id> {
  return z.array(id).refine((ids) => new Set(ids).size === ids.length, message);
}
