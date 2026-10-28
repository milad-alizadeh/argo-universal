import { z } from 'zod';

// Where a moved row lands: the row, the Section it lands in, and its index among that Section's rows once moved.
export const listMoveProps = z.object({
  id: z.string().describe('The moved row id.'),
  section: z
    .string()
    .optional()
    .describe(
      'The id of the Section it lands in; absent for rows outside any Section.',
    ),
  index: z
    .number()
    .int()
    .nonnegative()
    .describe("Its index among that Section's rows after the move."),
});
