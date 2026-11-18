import type { SessionUpdate } from '@repo/contracts';
import type { Database } from '@repo/db';
import { feedRow } from '@repo/db/schema';
import { and, desc, eq, inArray, type SQL } from 'drizzle-orm';
import {
  type FeedRowWrite,
  hydrateStoredFeedRow,
  storedFeedColumns,
  withoutVoiceMarkers,
} from '../feed';

// About 5,000 tokens at four characters a token.
const briefingCharacters = 20_000;

const recentRows = 300;

const speakers: Partial<Record<SessionUpdate['sessionUpdate'], string>> = {
  user_message: 'Person',
  agent_message: 'Agent',
};

const textOf = (row: SessionUpdate): string =>
  'content' in row
    ? row.content
        .map((block) => (block.type === 'text' ? block.text : ''))
        .join('')
        .trim()
    : '';

// One line of the transcript: who said it and what, without voice marks.
const lineOf = (row: SessionUpdate): string | undefined => {
  const speaker = speakers[row.sessionUpdate];
  const text = speaker && textOf(withoutVoiceMarkers(row));

  return text ? `${speaker}: ${text}` : undefined;
};

// The newest lines that fit `room` characters, oldest first.
function newestFitting(lines: readonly string[], room: number): string[] {
  const kept: string[] = [];
  let used = 0;

  for (const line of lines) {
    const clipped = line.slice(-room);
    used += clipped.length + 1;

    if (used > room) break;
    kept.push(clipped);
  }

  return kept.reverse();
}

const conversation = (sessionId: string): SQL | undefined =>
  and(
    eq(feedRow.sessionId, sessionId),
    inArray(feedRow.sessionUpdate, ['user_message', 'agent_message']),
  );

const recentMessages = (
  database: Database,
  sessionId: string,
): FeedRowWrite[] =>
  database
    .select(storedFeedColumns)
    .from(feedRow)
    .where(conversation(sessionId))
    .orderBy(desc(feedRow.position))
    .limit(recentRows)
    .all();

// The Session's recent conversation, newest first.
const recentLines = (database: Database, sessionId: string): string[] =>
  recentMessages(database, sessionId)
    .map((row) => lineOf(hydrateStoredFeedRow(sessionId, row)))
    .filter((line): line is string => line !== undefined);

// What the voice is told before it speaks: the title and working folder, then as much recent conversation as fits.
export function briefingOf(
  database: Database,
  session: { id: string; title: string; folder: string },
): string {
  const header = `Session: ${session.title}\nWorking folder: ${session.folder}`;
  const room = briefingCharacters - header.length;
  const lines = newestFitting(recentLines(database, session.id), room);

  return [
    header,
    ...(lines.length > 0 ? ['Recent conversation:', ...lines] : []),
  ].join('\n');
}
