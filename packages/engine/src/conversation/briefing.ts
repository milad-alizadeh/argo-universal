import type { SentPromptSender, SessionUpdate } from '@repo/contracts';
import type { Database } from '@repo/db';
import { feedRow } from '@repo/db/schema';
import { and, desc, eq, inArray, type SQL } from 'drizzle-orm';
import {
  type FeedRowWrite,
  messageText,
  readStoredFeedRow,
  storedFeedColumns,
  withoutVoiceInstruction,
} from '../feed';

// About 5,000 tokens at four characters a token.
const briefingCharacters = 20_000;

const recentRows = 300;

// The rows a briefing reads: what the person, the Agent, the voice and other senders said (ADR-0064).
const spokenKinds = [
  'user_message',
  'agent_message',
  'prompt_message',
  'person_transcript',
  'voice_transcript',
] as const satisfies readonly SessionUpdate['sessionUpdate'][];

type Spoken = Extract<
  SessionUpdate,
  { sessionUpdate: (typeof spokenKinds)[number] }
>;

const isSpoken = (row: SessionUpdate): row is Spoken =>
  spokenKinds.some((kind) => kind === row.sessionUpdate);

const speakers = {
  user_message: 'Person',
  person_transcript: 'Person',
  agent_message: 'Agent',
  voice_transcript: 'Voice',
} as const satisfies Record<
  Exclude<Spoken['sessionUpdate'], 'prompt_message'>,
  string
>;

// A Prompt the person did not send, named by its sender; the voice's carries no instruction to the Agent.
const promptLine = (sender: SentPromptSender, text: string): string =>
  sender.type === 'conversation'
    ? `Conversation request: ${withoutVoiceInstruction(text)}`
    : `From ${sender.title}: ${text}`;

const labelled = (row: Spoken, text: string): string =>
  row.sessionUpdate === 'prompt_message'
    ? promptLine(row._meta.argo.sender, text)
    : `${speakers[row.sessionUpdate]}: ${text}`;

// One line of the transcript: who said it and what.
const lineOf = (row: SessionUpdate): string | undefined => {
  if (!isSpoken(row)) return undefined;
  const text = messageText(row.content).trim();

  return text ? labelled(row, text) : undefined;
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
    inArray(feedRow.sessionUpdate, spokenKinds),
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
    .map((row) => lineOf(readStoredFeedRow(sessionId, row)))
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
