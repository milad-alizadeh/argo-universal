import { z } from 'zod';
import { handler } from './kit-component-props';
import { pressHandler } from './kit-event-props';

export const boardProps = z.object({
  accessibilityLabel: z
    .string()
    .optional()
    .describe('Names the board for screen readers.'),
  onMove: handler('onMove').optional(),
});

export const boardColumnProps = z.object({
  id: z.string().describe('The column identity a move reports.'),
  title: z.string().describe('The column title.'),
  count: z
    .number()
    .int()
    .nonnegative()
    .optional()
    .describe(
      'The count beside the title, such as every issue in a status; defaults to the cards the column shows.',
    ),
});

export const boardCardProps = z.object({
  id: z.string().describe('The card identity a move reports.'),
  title: z.string().describe('The card title.'),
  subtitle: z.string().optional().describe('A second line below the title.'),
  movesTo: z
    .array(z.string())
    .readonly()
    .optional()
    .describe(
      'The ids of the columns the card may move to; only those accept its drop. Without it, the card does not move.',
    ),
  column: z
    .string()
    .optional()
    .describe(
      'The column the card shows in, when not the one it is written in; a move shows it there at once.',
    ),
  pending: z
    .boolean()
    .optional()
    .describe('Whether a move of the card is waiting on its Operation.'),
  accessibilityLabel: z
    .string()
    .optional()
    .describe('Optional spoken label; defaults to title and subtitle.'),
  onPress: pressHandler.optional().describe('The action run on activation.'),
});

// What a card's move reports: the card and the column it lands in.
export const boardMoveProps = z.object({
  id: z.string().describe('The moved card id.'),
  column: z.string().describe('The id of the column it lands in.'),
});

export type BoardMove = z.infer<typeof boardMoveProps>;
