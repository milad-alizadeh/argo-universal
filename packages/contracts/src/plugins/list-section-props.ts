import { z } from 'zod';
import { handler } from './kit-component-props';

export const listSectionProps = z.object({
  id: z.string().optional().describe('The Section identity a move reports.'),
  selectionMode: z
    .enum(['single', 'multiple'])
    .optional()
    .describe('The section choice mode.'),
  selection: z
    .array(z.string())
    .readonly()
    .optional()
    .describe('Selected row ids.'),
  onSelectionChange: handler('onSelectionChange').optional(),
  title: z.string().optional().describe('The row or section title.'),
  subtitle: z.string().optional().describe('A second line below the title.'),
  footer: z.string().optional().describe('Supporting text below the section.'),
  collapsible: z
    .boolean()
    .optional()
    .describe(
      "Its title folds and opens its rows, after an open or closed folder, as the Sessions list's Projects do. The App keeps which Sections are folded, by id, while it runs.",
    ),
});
