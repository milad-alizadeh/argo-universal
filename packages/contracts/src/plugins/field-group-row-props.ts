import { z } from 'zod';
import { systemSymbolSource } from '../kit-symbols/icon-schema';
import { stockIcon } from '../kit-symbols/stock-icon-schema';

/*
 * Every row mirrors Expo UI's universal ListItem: a `title`, a `leading` icon, and
 * what sits at the end (`trailing` is each control's own value). A row has no free Slots.
 */
export const fieldGroupFieldProps = z.object({
  id: z
    .string()
    .optional()
    .describe(
      'The row’s identity for a grouped List with onMove: the List keys the row by it and reports it as a move’s id. A FieldGroup outside such a List draws nothing from it.',
    ),
  title: z.string().describe('The row’s label.'),
  disabled: z.boolean().optional().describe('Whether the row is disabled.'),
});

// A row that leads with an icon, as Expo UI's universal ListItem does.
export const fieldGroupRowProps = fieldGroupFieldProps.extend({
  leading: stockIcon
    .optional()
    .describe('A leading SF Symbol and Material Symbol.'),
});

// A page a row opens may have a symbol of its own, such as a Plugin's, as well as one of Argo's icons.
export const fieldGroupLinkRowProps = fieldGroupFieldProps.extend({
  leading: z
    .union([stockIcon, systemSymbolSource])
    .optional()
    .describe(
      'A leading icon: one of Argo’s symbols, or an SF Symbol and Material Symbol pair of the page’s own.',
    ),
  action: z
    .boolean()
    .optional()
    .describe(
      'The row performs an action rather than opening a page: no disclosure chevron on iOS and the web, and a button rather than a link to assistive technology.',
    ),
});
