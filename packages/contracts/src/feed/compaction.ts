import { z } from 'zod';
import { ContentBlock } from './content-block';
import { envelope, kind, noExtensionMeta } from './update-fields';

export const knownCompactionStatuses = [
  'in_progress',
  'completed',
  'failed',
  'cancelled',
] as const;

const CompactionStatus = z.string();

export const CompactionUpdate = z.strictObject({
  ...envelope,
  sessionUpdate: kind('compaction_update'),
  compactionId: z.string(),
  status: CompactionStatus,
  summary: z.array(ContentBlock).optional(),
  error: z.string().optional(),
  _meta: noExtensionMeta,
});

export type CompactionUpdate = z.infer<typeof CompactionUpdate>;
