import type { NonUserPromptSender, SessionUpdate } from '@repo/contracts';
import { feedRow } from '@repo/db/schema';
import { afterEach, describe, expect, it } from 'vitest';
import { openTestDatabase } from '#mocks/database';
import { toFeedRowWrite } from '../feed';
import { briefingOf } from './briefing';

const sessionId = 'session-1';

let opened: ReturnType<typeof openTestDatabase> | undefined;

afterEach(() => opened?.remove());

const promptFrom = (
  sender: NonUserPromptSender,
  text: string,
): SessionUpdate => ({
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

const briefingWith = (row: SessionUpdate): string => {
  opened = openTestDatabase();
  const { database } = opened;
  database
    .insert(feedRow)
    .values({ ...toFeedRowWrite(row), sessionId })
    .run();

  return briefingOf(database, { id: sessionId, title: 'Work', folder: '/' });
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
  ] satisfies [NonUserPromptSender, string][])(
    'is named by the sender that sent it',
    (sender, line) => {
      expect(briefingWith(promptFrom(sender, 'Ship it'))).toContain(line);
    },
  );
});
