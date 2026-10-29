import type {
  AgentMessage,
  SessionFeedInput,
  SessionFeedOutput,
  SessionUpdate,
} from '@repo/contracts';
import type { Database } from '@repo/db';
import { feedRow } from '@repo/db/schema';
import { createRejectionCounter } from '@repo/machine-log';
import { TRPCError } from '@trpc/server';
import { and, desc, eq, lt, type SQL } from 'drizzle-orm';
import type { FeedDeps } from './feed';
import { storedFeedColumns, type FeedRowWrite } from './feed-row';
import { readFeedRows } from './merged-rows';

type MessageSources = Pick<
  FeedDeps,
  'database' | 'readSession' | 'findFeed' | 'findWriter'
>;

type MessageReader = MessageSources & {
  rejections: ReturnType<typeof createRejectionCounter>;
};

type MessageWindow = SessionFeedInput & { epoch: number; staleCursor: boolean };

const isAgentMessage = (row: SessionUpdate): row is AgentMessage =>
  row.sessionUpdate === 'agent_message';

export function createAgentMessageReader(
  sources: MessageSources,
): (input: SessionFeedInput) => SessionFeedOutput {
  const reader = { ...sources, rejections: createRejectionCounter('feed') };

  return (input): SessionFeedOutput => readMessages(reader, input);
}

function readMessages(
  reader: MessageReader,
  input: SessionFeedInput,
): SessionFeedOutput {
  const { epoch } = reader.readSession(input.sessionId);
  const window = messageWindow(input, epoch);
  const stored = storedMessages(reader.database, window);

  const merged = readFeedRows(reader, input.sessionId, {
    stored,
    keep: isAgentMessage,
  });

  return messagePage(checkedMessages(merged, reader.rejections), window);
}

function messageWindow(input: SessionFeedInput, epoch: number): MessageWindow {
  const staleCursor = staleEpoch(input, epoch);

  return {
    ...input,
    epoch,
    staleCursor,
    cursor: staleCursor ? undefined : input.cursor,
  };
}

const staleEpoch = (input: SessionFeedInput, epoch: number): boolean =>
  input.epoch !== undefined && input.epoch !== epoch;

function storedMessages(
  database: Database,
  input: SessionFeedInput,
): FeedRowWrite[] {
  return database
    .select(storedFeedColumns)
    .from(feedRow)
    .where(messageFilter(input))
    .orderBy(desc(feedRow.position))
    .limit(input.limit + 1)
    .all();
}

function messageFilter(input: SessionFeedInput): SQL | undefined {
  return and(
    eq(feedRow.sessionId, input.sessionId),
    eq(feedRow.sessionUpdate, 'agent_message'),
    input.cursor === undefined ? undefined : lt(feedRow.position, input.cursor),
  );
}

function checkedMessages(
  { rows, rejected }: { rows: AgentMessage[]; rejected: unknown[] },
  rejections: MessageReader['rejections'],
): AgentMessage[] {
  for (const error of rejected)
    rejections.report('rejected Agent message', error);

  if (rejected.length > 0)
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Unrecognised Agent message',
    });

  return rows;
}

function messagePage(
  rows: AgentMessage[],
  window: MessageWindow,
): SessionFeedOutput {
  const matching = orderedMessages(rows, window.cursor);

  const page = matching.slice(0, window.limit);
  const nextCursor = olderCursor(matching.length > window.limit, page);

  return {
    epoch: window.epoch,
    messages: page.reverse(),
    nextCursor,
    staleCursor: window.staleCursor,
  };
}

const orderedMessages = (
  rows: AgentMessage[],
  cursor: number | undefined,
): AgentMessage[] =>
  rows
    .filter((row) => beforeCursor(row, cursor))
    .sort((first, second) => second.position - first.position);

const beforeCursor = (row: AgentMessage, cursor: number | undefined): boolean =>
  cursor === undefined || row.position < cursor;

function olderCursor(hasMore: boolean, page: AgentMessage[]): number | null {
  const oldest = page.at(-1);

  if (!hasMore || !oldest) return null;

  return oldest.position;
}
