import type { CompactionUpdate as AcpCompactionUpdate } from '@agentclientprotocol/sdk';
import {
  knownCompactionStatuses,
  type ContentBlock,
  type FeedUpdate,
  type SessionUpdate,
} from '@repo/contracts';
import type { AssembledContent } from './assembly';
import { createAcpContentMetadata, mapSupportedContentBlock } from './content';
import { createScopedFeedRowId } from './identity';

type CompactionRow = Extract<
  FeedUpdate,
  { sessionUpdate: 'compaction_update' }
>;
export type CompactionInput = {
  acpSessionId: string;
  findRow: (id: string) => SessionUpdate | undefined;
};
export type CompactionResult = AssembledContent | { rejection: string };
const terminalStatuses: ReadonlySet<string> = new Set([
  'completed',
  'failed',
  'cancelled',
]);
const knownStatuses: ReadonlySet<string> = new Set(knownCompactionStatuses);
const replaceCompactionSummary = (
  existing: ContentBlock[] | undefined,
  summary: AcpCompactionUpdate['summary'],
): ContentBlock[] | undefined => {
  if (summary === undefined) return existing;
  if (summary === null) return undefined;
  return summary.map(mapSupportedContentBlock);
};
const patchCompactionValue = <Value>(
  existing: Value | undefined,
  replacement: Value | null | undefined,
): Value | undefined =>
  replacement === undefined ? existing : (replacement ?? undefined);
const replaceCompactionDetails = (
  existing: CompactionRow,
  update: AcpCompactionUpdate,
): CompactionRow => ({
  ...existing,
  status: update.status,
  state: terminalStatuses.has(update.status) ? 'settled' : 'open',
  summary: replaceCompactionSummary(existing.summary, update.summary),
  error: patchCompactionValue(existing.error, update.error),
  _meta: createAcpContentMetadata(
    patchCompactionValue(existing._meta?.acp, update._meta),
  ),
});
const createCompactionRow = (
  id: string,
  update: AcpCompactionUpdate,
): CompactionRow => ({
  id,
  sessionUpdate: 'compaction_update',
  compactionId: update.compactionId,
  status: update.status,
  state: 'open',
});
export const createCompactionRowId = (
  input: CompactionInput,
  compactionId: string,
): string =>
  createScopedFeedRowId({
    acpSessionId: input.acpSessionId,
    kind: 'compaction_update',
    upstreamId: compactionId,
  });
const readOrCreateCompactionRow = (
  compactionInput: CompactionInput,
  update: AcpCompactionUpdate,
): CompactionRow => {
  const id = createCompactionRowId(compactionInput, update.compactionId);
  const previous = compactionInput.findRow(id);
  return previous?.sessionUpdate === 'compaction_update'
    ? previous
    : createCompactionRow(id, update);
};
const describeUnknownCompactionStatus = (status: string): string[] =>
  knownStatuses.has(status) ? [] : [`Unknown compaction status: ${status}`];
const collectCompactionDiagnostics = (
  update: AcpCompactionUpdate,
  row: CompactionRow,
): string[] => {
  if (update.summary == null)
    return describeUnknownCompactionStatus(update.status);
  return [
    ...describeUnknownCompactionStatus(update.status),
    ...(row.summary ?? []).flatMap((block) =>
      block.type === 'unsupported' ? [block.reason] : [],
    ),
  ];
};
const describeInvalidCompactionSummary = (
  update: AcpCompactionUpdate,
): string | undefined => {
  if (update.summary == null) return undefined;
  return describeInvalidNonNullCompactionSummary(update.summary, update.status);
};
const describeInvalidNonNullCompactionSummary = (
  summary: NonNullable<AcpCompactionUpdate['summary']>,
  status: string,
): string | undefined => {
  if (!summary.length) return undefined;
  return status === 'completed'
    ? undefined
    : 'A replacement Compaction summary requires completed status';
};
const describeInvalidCompactionError = (
  update: AcpCompactionUpdate,
): string | undefined => {
  if (update.error == null) return undefined;
  return update.status === 'failed'
    ? undefined
    : 'A Compaction error requires failed status';
};
const createCompactionReplacement = (
  input: CompactionInput,
  update: AcpCompactionUpdate,
): AssembledContent => {
  const row = replaceCompactionDetails(
    readOrCreateCompactionRow(input, update),
    update,
  );
  return {
    change: { type: 'upsert', update: row },
    diagnostics: collectCompactionDiagnostics(update, row),
  };
};
export const applyCompactionUpdate = (
  input: CompactionInput,
  update: AcpCompactionUpdate,
): CompactionResult => {
  const rejection =
    describeInvalidCompactionSummary(update) ??
    describeInvalidCompactionError(update);
  return rejection ? { rejection } : createCompactionReplacement(input, update);
};
