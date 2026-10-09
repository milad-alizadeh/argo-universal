import type { SessionUpdate } from '@repo/contracts';
import {
  applyFeedChange,
  changedRowId,
  type Feed,
  type FeedChangeResult,
} from '../feed-change';
import type {
  AcpContentInput,
  ContentAssemblyInput,
  AssembledContent,
} from './assembly';
import { assembleContentChange } from './content-dispatch';

type ContentResult = FeedChangeResult & Omit<AssembledContent, 'change'>;
const readExistingFeedRow = (
  input: AcpContentInput,
  id: string,
): SessionUpdate | undefined => {
  const row = input.feed.rows[id] ?? input.findWrittenRow(id);
  if (row) input.feed.rows[id] = row;
  return row;
};
const copyFeedForAssembly = (feed: Feed): Feed => ({
  sessionId: feed.sessionId,
  maxRevision: feed.maxRevision,
  nextPosition: feed.nextPosition,
  rows: { ...feed.rows },
});
const createAssemblyInput = (input: AcpContentInput): ContentAssemblyInput => {
  const copied = { ...input, feed: copyFeedForAssembly(input.feed) };
  return { ...copied, findRow: (id) => readExistingFeedRow(copied, id) };
};
const applyContentChange = (
  input: ContentAssemblyInput,
): ContentResult | undefined => {
  const assembled = assembleContentChange(input);
  if (!assembled) return undefined;
  if ('rejection' in assembled) return assembled;
  input.findRow(changedRowId(assembled.change));
  return {
    ...applyFeedChange(input.feed, assembled.change, input.turnId),
    streams: assembled.streams,
    diagnostics: assembled.diagnostics,
    unaddressedPlan: assembled.unaddressedPlan,
  };
};
export const applyAcpContentUpdate = (
  input: AcpContentInput,
): ContentResult | undefined => {
  try {
    return applyContentChange(createAssemblyInput(input));
  } catch (error) {
    return {
      rejection: `could not apply ACP content: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
};
