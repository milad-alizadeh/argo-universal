import { z } from 'zod';
import { stockIcon } from '../kit-symbols/stock-icon-schema';

/*
 * Every row mirrors Expo UI's universal ListItem: a `title`, a `leading` icon, and
 * what sits at the end (`trailing` is each control's own value). A row has no free Slots.
 */
export const fieldGroupFieldProps = z.object({
  title: z.string().describe('The row’s label.'),
  disabled: z.boolean().optional().describe('Whether the row is disabled.'),
});

// A row that leads with an icon, as Expo UI's universal ListItem does.
export const fieldGroupRowProps = fieldGroupFieldProps.extend({
  leading: stockIcon
    .optional()
    .describe('A leading SF Symbol and Material Symbol.'),
});
