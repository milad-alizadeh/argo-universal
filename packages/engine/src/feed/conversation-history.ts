import type { SessionUpdate } from '@repo/contracts';
import { feedRow } from '@repo/db/schema';
import { and, asc, desc, eq, inArray, isNull, sql } from 'drizzle-orm';
import {
  withoutAnalysis,
  withoutMarks,
  withoutVoiceInstruction,
} from './conversation-markers';
import type { FeedDeps } from './feed';
import { storedFeedColumns, type FeedRowWrite } from './feed-row';
import { readFeedRows } from './merged-rows';
import { messageText } from './message-text';
import { clearedContextNotice } from './session-restarted';

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

const isClear = (row: SessionUpdate): boolean =>
  row.sessionUpdate === 'notice' &&
  row.turnId === null &&
  row.severity === 'info' &&
  row.title === clearedContextNotice.title &&
  row.description === clearedContextNotice.description;

const speakers = {
  user_message: 'Person',
  person_transcript: 'Person',
  agent_message: 'Agent',
  voice_transcript: 'Voice',
} as const;

const isHistory = (row: SessionUpdate): row is HistoryRow =>
  row.sessionUpdate === 'compaction_update' ||
  isClear(row) ||
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

function storedSummaries(
  database: FeedDeps['database'],
  sessionId: string,
): FeedRowWrite[] {
  return database
    .select(storedFeedColumns)
    .from(feedRow)
    .where(
      and(
        eq(feedRow.sessionId, sessionId),
        eq(feedRow.sessionUpdate, 'compaction_update'),
        sql`json_extract(${feedRow.payload}, '$.status') = 'completed'`,
      ),
    )
    .orderBy(desc(feedRow.position))
    .limit(earlierRows)
    .all();
}

function storedClear(
  database: FeedDeps['database'],
  sessionId: string,
): FeedRowWrite[] {
  return database
    .select(storedFeedColumns)
    .from(feedRow)
    .where(
      and(
        eq(feedRow.sessionId, sessionId),
        eq(feedRow.sessionUpdate, 'notice'),
        isNull(feedRow.turnId),
        sql`json_extract(${feedRow.payload}, '$.title') = ${clearedContextNotice.title}`,
        sql`json_extract(${feedRow.payload}, '$.description') = ${clearedContextNotice.description}`,
        sql`json_extract(${feedRow.payload}, '$.severity') = 'info'`,
      ),
    )
    .orderBy(desc(feedRow.position))
    .limit(1)
    .all();
}

function historyRows(
  sources: ConversationHistorySources,
  sessionId: string,
): HistoryRow[] {
  const { database } = sources;

  const stored = [
    ...storedMessages(database, sessionId),
    ...storedSummaries(database, sessionId),
    ...storedClear(database, sessionId),
  ];

  const { rows } = readFeedRows(sources, sessionId, {
    stored,
    keep: isHistory,
  });

  rows.sort(byPosition);

  return rows.slice(rows.findLastIndex(isClear) + 1);
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
function earlierLines(lines: readonly string[], room: number): string[] {
  const count = Math.min(lines.length, earlierRows);
  const limit = Math.floor(room / earlierRows) - 1;

  if (count === 0 || limit < 1) return [];

  // Keep the ends of the older window and space the other samples between them.
  const stride = (lines.length - 1) / Math.max(1, count - 1);

  return Array.from(
    { length: count },
    (_, index) => lines[Math.round(index * stride)],
  ).flatMap((line) => (line === undefined ? [] : [clip(line, limit)]));
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
    return sections([], summary, recent);

  const { earlier, tail } = splitHistory(prior, messages, available);

  return sections(earlier, summary, tail);
}

type SplitHistory = { earlier: string[]; tail: string[] };

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

  return {
    earlier: earlierLines(earlier, earlierBudget - earlierHeading.length - 1),
    tail,
  };
}

function sections(
  earlier: string[],
  summary: string | undefined,
  recent: string[],
): string {
  return [
    ...(earlier.length ? [earlierHeading, ...earlier] : []),
    ...(summary ? [summary] : []),
    ...(recent.length ? [recentHeading, ...recent] : []),
  ].join('\n');
}
