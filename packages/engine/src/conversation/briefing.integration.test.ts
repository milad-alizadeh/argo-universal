import type { SentPromptSender, SessionUpdate } from '@repo/contracts';
import { feedRow } from '@repo/db/schema';
import { afterEach, describe, expect, it } from 'vitest';
import { openTestDatabase } from '#mocks/database';
import { toFeedRowWrite } from '../feed';
import { briefingOf } from './briefing';

const sessionId = 'session-1';

let opened: ReturnType<typeof openTestDatabase> | undefined;

afterEach(() => opened?.remove());

const promptFrom = (sender: SentPromptSender, text: string): SessionUpdate => ({
  id: `prompt-${sender.type}`,
  sessionId,
  position: 0,
  revision: 1,
  turnId: null,
  state: 'settled',
  sessionUpdate: 'prompt_message',
  messageId: `prompt-${sender.type}`,
  content: [{ type: 'text', text }],
  _meta: { argo: { sender } },
});

const briefingWith = (...rows: SessionUpdate[]): string => {
  opened = openTestDatabase();
  const { database } = opened;
  database
    .insert(feedRow)
    .values(rows.map((row) => ({ ...toFeedRowWrite(row), sessionId })))
    .run();

  return briefingOf(
    {
      database,
      findFeed: (): undefined => undefined,
      findWriter: (): undefined => undefined,
    },
    { id: sessionId, title: 'Work', folder: '/' },
  );
};

describe('a Prompt in the briefing', () => {
  it.each([
    [
      { type: 'session', sessionId: 'other', title: 'Release' },
      'From Release: Ship it',
    ],
    [
      { type: 'plugin', pluginId: 'review', title: 'Review' },
      'From Review: Ship it',
    ],
  ] satisfies [SentPromptSender, string][])(
    'is named by the sender that sent it',
    (sender, line) => {
      expect(briefingWith(promptFrom(sender, 'Ship it'))).toContain(line);
    },
  );
});

const compaction = (
  position: number,
  status: string,
  text: string,
): SessionUpdate => ({
  id: `compaction-${position}`,
  sessionId,
  position,
  revision: position + 1,
  turnId: null,
  state: status === 'in_progress' ? 'open' : 'settled',
  sessionUpdate: 'compaction_update',
  compactionId: `compaction-${position}`,
  status,
  summary: [{ type: 'text', text }],
});

it('keeps the latest completed Compaction and later turns in order', () => {
  const sender = {
    type: 'session',
    sessionId: 'other',
    title: 'Release',
  } as const;

  const briefing = briefingWith(
    promptFrom(sender, 'Original work'),
    compaction(1, 'completed', 'Obsolete summary'),
    compaction(
      2,
      'completed',
      '[ANALYSIS] Private notes\n[COMPLETE] The design is pending review.',
    ),
    compaction(3, 'in_progress', 'Partial summary'),
    { ...promptFrom(sender, 'Latest update'), id: 'latest', position: 4 },
  );

  expect(briefing).toMatch(
    /The design is pending review\.[\s\S]+Latest update/,
  );
  expect(briefing).not.toMatch(
    /Obsolete summary|Partial summary|Private notes/,
  );
});
