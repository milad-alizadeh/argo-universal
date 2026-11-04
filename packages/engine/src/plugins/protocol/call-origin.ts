import { z } from 'zod';

/*
 * What a worker's call runs for, which the Server looks up rather than trusts: the draw or the Operation
 * whose code made it, by id, or the Hook's Project it ran in.
 */
export const callOrigin = {
  projectId: z.string().optional(),
  draw: z.number().int().nonnegative().optional(),
  operation: z.number().int().nonnegative().optional(),
};
