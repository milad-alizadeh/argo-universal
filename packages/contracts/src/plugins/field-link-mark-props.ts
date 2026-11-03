import { z } from 'zod';
import { stockIcon } from '../kit-symbols/stock-icon-schema';

export const fieldLinkMark = z.object({
  icon: stockIcon,
  tone: z.enum(['neutral', 'info', 'done', 'warning', 'success', 'danger']),
  label: z.string(),
  dimmed: z.boolean().optional(),
  status: z
    .object({ tone: z.enum(['success', 'warning']), label: z.string() })
    .optional(),
  plain: z.boolean().optional(),
});
