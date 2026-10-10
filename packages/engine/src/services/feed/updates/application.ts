import type { SessionUpdate } from '@repo/contracts';
import {
  applyFeedChange,
  changedRowId,
  type Feed,
  type FeedChangeResult,
} from '../feed-change';
import type {
  FeedContext,
  FeedEvent,
  FeedInternalEvent,
} from '../feed-machine';
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
    blobs: assembled.blobs,
    unaddressedPlan: assembled.unaddressedPlan,
  };
};
const applyAcpContentUpdate = (
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

type AcpFeedApplication = {
  state: Partial<FeedContext>;
  events: FeedInternalEvent[];
};
const createAcpContentInput = (
  context: FeedContext,
  event: Extract<FeedEvent, { type: 'feed.acpUpdate' }>,
): AcpContentInput => ({
  ...event,
  feed: context,
  streams: context.messageStreams,
  findWrittenRow: context.findWrittenRow,
  findUnaddressedPlan: context.findUnaddressedPlan,
  unaddressedPlan: context.unaddressedPlan,
});
const appendOutputBlobs = (
  context: FeedContext,
  result: Pick<ContentResult, 'blobs'>,
): FeedContext['outputBlobs'] => [
  ...context.outputBlobs,
  ...(result.blobs ?? []),
];
const createAcceptedFeedState = (
  context: FeedContext,
  result: Extract<ContentResult, { feed: Feed }>,
  id: string,
): Partial<FeedContext> => ({
  ...result.feed,
  messageStreams: result.streams ?? context.messageStreams,
  unaddressedPlan: result.unaddressedPlan ?? context.unaddressedPlan,
  activityAt: context.now(),
  changedRowIds: [...new Set([...context.changedRowIds, id])],
  streamEvents: [...context.streamEvents, result.streamEvent],
  outputBlobs: appendOutputBlobs(context, result),
});
const createAcceptedFeedEvents = (
  result: Extract<ContentResult, { feed: Feed }>,
  id: string,
): FeedInternalEvent[] => [
  {
    type: 'feed.changeApplied',
    settled: result.feed.rows[id]?.state === 'settled',
  },
  ...(result.diagnostics ?? []).map((reason): FeedInternalEvent => ({
    type: 'feed.changeRejected',
    reason,
  })),
];
const prepareAcceptedFeedApplication = (
  context: FeedContext,
  result: Extract<ContentResult, { feed: Feed }>,
): AcpFeedApplication => {
  const id =
    result.streamEvent.type === 'row.upsert'
      ? result.streamEvent.row.id
      : result.streamEvent.id;
  return {
    state: createAcceptedFeedState(context, result, id),
    events: createAcceptedFeedEvents(result, id),
  };
};
export const prepareAcpFeedApplication = (
  context: FeedContext,
  event: Extract<FeedEvent, { type: 'feed.acpUpdate' }>,
): AcpFeedApplication | { rejection: string } | undefined => {
  const result = applyAcpContentUpdate(createAcpContentInput(context, event));
  if (!result) return undefined;
  return 'rejection' in result
    ? result
    : prepareAcceptedFeedApplication(context, result);
};
