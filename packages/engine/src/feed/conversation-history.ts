import type { SessionUpdate } from '@repo/contracts';
import { feedRow } from '@repo/db/schema';
import { createRejectionCounter } from '@repo/machine-log';
import {
  and,
  asc,
  desc,
  eq,
  inArray,
  isNull,
  like,
  or,
  sql,
  type SQL,
} from 'drizzle-orm';
import {
  withoutAnalysis,
  withoutMarks,
  withoutVoiceInstruction,
} from './conversation-markers';
import type { FeedDeps } from './feed';
import { storedFeedColumns, type FeedRowWrite } from './feed-row';
import { readFeedRows } from './merged-rows';
import { messageText } from './message-text';
import {
  clearedContextIdPrefix,
  isContextCleared,
  legacyContextClearedNotice,
} from './session-restarted';

export type ConversationHistorySources = Pick<
  FeedDeps,
  'database' | 'findFeed' | 'findWriter'
>;

export const conversationHistoryCharacters = 20_000;

const transcriptLineCharacters = 5_000;

const summaryCharacters = 3_000;

const earlierShare = 0.3;

const tailFraction = 0.33;

const messageKinds = [
  'user_message',
  'agent_message',
  'prompt_message',
  'person_transcript',
  'voice_transcript',
] as const;

type Message = Extract<
  SessionUpdate,
  { sessionUpdate: (typeof messageKinds)[number] }
>;

type HistoryRow =
  | Message
  | Extract<SessionUpdate, { sessionUpdate: 'compaction_update' | 'notice' }>;

const speakers = {
  user_message: 'Person',
  person_transcript: 'Person',
  agent_message: 'Agent',
  voice_transcript: 'Voice',
} as const;

const isHistory = (row: SessionUpdate): row is HistoryRow =>
  row.sessionUpdate === 'compaction_update' ||
  isContextCleared(row) ||
  messageKinds.some((kind) => kind === row.sessionUpdate);

const isTranscript = ({ sessionUpdate }: HistoryRow): boolean =>
  sessionUpdate === 'person_transcript' || sessionUpdate === 'voice_transcript';

const isHandOver = (row: HistoryRow): boolean =>
  row.sessionUpdate === 'prompt_message' &&
  row._meta.argo.sender.type === 'conversation';

function lineOf(row: HistoryRow): string | undefined {
  if (row.sessionUpdate === 'notice') return undefined;

  if (row.sessionUpdate === 'compaction_update') {
    if (row.status !== 'completed') return undefined;

    const text = withoutMarks(
      withoutAnalysis(messageText(row.summary ?? []), 'progress'),
      true,
    ).trim();

    return text ? `Agent's Compaction summary: ${text}` : undefined;
  }

  const text = messageText(row.content).trim();

  if (!text) return undefined;

  if (row.sessionUpdate !== 'prompt_message')
    return `${speakers[row.sessionUpdate]}: ${text}`;

  const { sender } = row._meta.argo;

  return sender.type === 'conversation'
    ? `Conversation request: ${withoutVoiceInstruction(text)}`
    : `From ${sender.title}: ${text}`;
}

const byPosition = (a: HistoryRow, b: HistoryRow): number =>
  a.position - b.position;

const recentRows = 300;

const earlierRows = 12;

const rejections = createRejectionCounter('feed');

type HistoryWindow = {
  filter: SQL | undefined;
  limit: number;
};

function storedHistory(
  database: FeedDeps['database'],
  sessionId: string,
  { filter, limit }: HistoryWindow,
): FeedRowWrite[] {
  return database
    .select(storedFeedColumns)
    .from(feedRow)
    .where(and(eq(feedRow.sessionId, sessionId), filter))
    .orderBy(desc(feedRow.position))
    .limit(limit)
    .all();
}

function storedMessages(
  database: FeedDeps['database'],
  sessionId: string,
): FeedRowWrite[] {
  const history = database
    .select(storedFeedColumns)
    .from(feedRow)
    .where(
      and(
        eq(feedRow.sessionId, sessionId),
        inArray(feedRow.sessionUpdate, messageKinds),
      ),
    );

  const recent = history
    .orderBy(desc(feedRow.position))
    .limit(recentRows)
    .all();

  if (recent.length < recentRows) return recent;

  return [
    ...recent,
    ...history.orderBy(asc(feedRow.position)).limit(earlierRows).all(),
  ];
}

const summaryFilter = and(
  eq(feedRow.sessionUpdate, 'compaction_update'),
  sql`case when json_valid(${feedRow.payload}) then json_extract(${feedRow.payload}, '$.status') = 'completed' else false end`,
);

const clearFilter = and(
  eq(feedRow.sessionUpdate, 'notice'),
  isNull(feedRow.turnId),
  or(
    like(feedRow.id, `${clearedContextIdPrefix}%`),
    sql`case when json_valid(${feedRow.payload}) then
      json_extract(${feedRow.payload}, '$.title') = ${legacyContextClearedNotice.title}
      and json_extract(${feedRow.payload}, '$.description') = ${legacyContextClearedNotice.description}
      and json_extract(${feedRow.payload}, '$.severity') = 'info'
      else false end`,
  ),
);

function historyRows(
  sources: ConversationHistorySources,
  sessionId: string,
): HistoryRow[] {
  const { database } = sources;

  const clears = storedHistory(database, sessionId, {
    filter: clearFilter,
    limit: 1,
  });

  const stored = [
    ...storedMessages(database, sessionId),
    ...storedHistory(database, sessionId, {
      filter: summaryFilter,
      limit: earlierRows,
    }),
    ...clears,
  ];

  const { rows, rejected } = readFeedRows(sources, sessionId, {
    stored,
    keep: isHistory,
  });

  for (const _ of rejected)
    rejections.report('rejected Conversation history row');

  rows.sort(byPosition);

  const cutoff = Math.max(
    clears[0]?.position ?? -1,
    rows.findLast(isContextCleared)?.position ?? -1,
  );

  return rows.filter(({ position }) => position > cutoff);
}

// Keep the attribution and the opening and closing words of an oversized message.
function clip(line: string, limit: number): string {
  if (line.length <= limit) return line;
  const tail = Math.floor(limit * tailFraction);

  if (tail === 0) return line.slice(0, limit);

  return `${line.slice(0, limit - tail - 1)}…${line.slice(-tail)}`;
}

function recentLines(lines: readonly string[], room: number): string[] {
  if (room < 2) return [];
  const kept: string[] = [];

  let left = room;

  for (const line of lines.toReversed()) {
    const limit = kept.length
      ? transcriptLineCharacters
      : Math.min(transcriptLineCharacters, left - 1);

    const excerpt = clip(line, limit);

    left -= excerpt.length + 1;

    if (left < 0) break;

    kept.push(excerpt);
  }

  return kept.reverse();
}

// Retain earlier topics across the window. Sample in Feed order when they cannot all fit.
type Excerpt = { index: number; text: string };

function earlierLines(lines: readonly string[], room: number): Excerpt[] {
  const count = Math.min(lines.length, earlierRows);
  const limit = Math.floor(room / earlierRows) - 1;

  if (count === 0 || limit < 1) return [];

  // Keep the ends of the older window and space the other samples between them.
  const stride = (lines.length - 1) / Math.max(1, count - 1);

  return Array.from({ length: count }, (_, index) =>
    Math.round(index * stride),
  ).flatMap((index) => {
    const line = lines[index];

    return line === undefined ? [] : [{ index, text: clip(line, limit) }];
  });
}

type HistoryOptions = {
  room: number;
  // A later Prompt only needs the dialogue that the Agent has yet to see.
  sinceHandOver?: boolean;
};

const recentHeading = 'Recent conversation:';

const earlierHeading = 'Earlier conversation excerpts:';

export function readConversationHistory(
  sources: ConversationHistorySources,
  sessionId: string,
  { room, sinceHandOver }: HistoryOptions,
): string {
  if (room <= recentHeading.length + 1) return '';
  const rows = historyRows(sources, sessionId);

  if (sinceHandOver) {
    const dialogue = rows
      .slice(rows.findLastIndex(isHandOver) + 1)
      .filter(isTranscript);

    return historyBriefing(dialogue, room);
  }

  return historyBriefing(rows, room);
}

const toLines = (rows: readonly HistoryRow[]): string[] =>
  rows
    .values()
    .map(lineOf)
    .filter((line) => line !== undefined)
    .toArray();

function latestSummary(
  rows: readonly HistoryRow[],
): { index: number; line: string } | undefined {
  for (let index = rows.length - 1; index >= 0; index--) {
    const row = rows[index];

    if (row?.sessionUpdate !== 'compaction_update') continue;

    const line = lineOf(row);

    if (line) return { index, line };
  }

  return undefined;
}

function historyBriefing(rows: readonly HistoryRow[], room: number): string {
  const latest = latestSummary(rows);

  const summary =
    latest &&
    clip(latest.line, Math.min(summaryCharacters, Math.floor(room / 2)));

  // The Agent's Compaction may never have seen the spoken dialogue.
  const prior = toLines(rows.slice(0, latest?.index ?? 0).filter(isTranscript));
  const messages = toLines(rows.slice((latest?.index ?? -1) + 1));
  const available = room - recentHeading.length - (summary?.length ?? 0) - 2;
  const recent = recentLines(messages, available);

  if (recent.length === messages.length && prior.length === 0)
    return sections({ before: [], after: [], tail: recent }, summary);

  return sections(splitHistory(prior, messages, available), summary);
}

type SplitHistory = { before: string[]; after: string[]; tail: string[] };

function splitHistory(
  prior: string[],
  messages: string[],
  available: number,
): SplitHistory {
  const earlierBudget = Math.floor(available * earlierShare);
  const tail = recentLines(messages, available - earlierBudget);

  const earlier = [
    ...prior,
    ...messages.slice(0, messages.length - tail.length),
  ];

  const before: string[] = [];
  const after: string[] = [];
  const headingRoom = (earlierHeading.length + 1) * (prior.length ? 2 : 1);

  for (const { index, text } of earlierLines(
    earlier,
    earlierBudget - headingRoom,
  )) {
    (index < prior.length ? before : after).push(text);
  }

  return { before, after, tail };
}

function sections(
  { before, after, tail }: SplitHistory,
  summary: string | undefined,
): string {
  return [
    ...(before.length ? [earlierHeading, ...before] : []),
    ...(summary ? [summary] : []),
    ...(after.length ? [earlierHeading, ...after] : []),
    ...(tail.length ? [recentHeading, ...tail] : []),
  ].join('\n');
}
