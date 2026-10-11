import type { CompactionSummaryChunk } from '@agentclientprotocol/sdk';
import type { CompactionUpdate, ContentBlock } from '@repo/contracts';
import type { AssembledContent } from './assembly';
import {
  createCompactionRowId,
  type CompactionInput,
  type CompactionResult,
} from './compaction';
import { mapSupportedContentBlock } from './content';

const readInProgressCompaction = (
  input: CompactionInput,
  compactionId: string,
): CompactionUpdate | undefined => {
  const previous = input.findRow(createCompactionRowId(input, compactionId));
  if (previous?.sessionUpdate !== 'compaction_update') return undefined;
  return selectInProgressCompaction(previous);
};
const selectInProgressCompaction = (
  row: CompactionUpdate,
): CompactionUpdate | undefined =>
  row.status === 'in_progress' ? row : undefined;
const createCompactionChunkChange = (
  row: CompactionUpdate,
  content: ContentBlock,
): AssembledContent => ({
  change: {
    type: 'patch',
    id: row.id,
    set: { summary: [...(row.summary ?? []), content] },
  },
  diagnostics: content.type === 'unsupported' ? [content.reason] : [],
});
export const appendCompactionSummary = (
  input: CompactionInput,
  chunk: CompactionSummaryChunk,
): CompactionResult => {
  const previous = readInProgressCompaction(input, chunk.compactionId);
  if (!previous)
    return { rejection: `Compaction ${chunk.compactionId} is not in progress` };
  return createCompactionChunkChange(
    previous,
    mapSupportedContentBlock(chunk.content),
  );
};
