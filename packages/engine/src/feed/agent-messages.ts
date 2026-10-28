import type {
  AgentMessage,
  SessionFeedInput,
  SessionFeedOutput,
  SessionUpdate,
} from '@repo/contracts';
import { feedRow } from '@repo/db/schema';
import { createRejectionCounter } from '@repo/machine-log';
import { TRPCError } from '@trpc/server';
import { and, desc, eq, lt } from 'drizzle-orm';
import type { FeedDeps } from './feed';
import { storedFeedColumns } from './feed-row';
import { readFeedRows } from './merged-rows';

type MessageSources = Pick<
  FeedDeps,
  'database' | 'readSession' | 'findFeed' | 'findWriter'
>;

const isAgentMessage = (row: SessionUpdate): row is AgentMessage =>
  row.sessionUpdate === 'agent_message';

export function createAgentMessageReader(
  sources: MessageSources,
): (input: SessionFeedInput) => SessionFeedOutput {
  const rejections = createRejectionCounter('feed');

  return (input): SessionFeedOutput => {
    const { epoch } = sources.readSession(input.sessionId);
    const staleCursor = input.epoch !== undefined && input.epoch !== epoch;
    const cursor = staleCursor ? undefined : input.cursor;

    const stored = sources.database
      .select(storedFeedColumns)
      .from(feedRow)
      .where(
        and(
          eq(feedRow.sessionId, input.sessionId),
          eq(feedRow.sessionUpdate, 'agent_message'),
          cursor === undefined ? undefined : lt(feedRow.position, cursor),
        ),
      )
      .orderBy(desc(feedRow.position))
      .limit(input.limit + 1)
      .all();

    const { rows, rejected } = readFeedRows(sources, input.sessionId, {
      stored,
      keep: isAgentMessage,
    });

    for (const error of rejected)
      rejections.report('rejected Agent message', error);

    if (rejected.length > 0)
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Unrecognised Agent message',
      });

    const matching = rows
      .filter((row) => cursor === undefined || row.position < cursor)
      .sort((first, second) => second.position - first.position);
    const page = matching.slice(0, input.limit);
    const nextCursor =
      matching.length > input.limit ? (page.at(-1)?.position ?? null) : null;

    return { epoch, messages: page.reverse(), nextCursor, staleCursor };
  };
}
