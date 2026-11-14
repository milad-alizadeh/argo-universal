import type { Page } from '@playwright/test';
import { z } from 'zod';
import { expect } from '../fixtures';
import { type FeedRows, readFeed, sessionId } from './feed';
import { query } from './server-query';

const QueueSnapshot = z.object({
  activeTurnId: z.string().nullable(),
  promptQueue: z.object({
    items: z.array(
      z.object({
        id: z.string(),
        revision: z.number(),
        prompt: z.array(
          z.object({ type: z.string(), text: z.string().optional() }),
        ),
      }),
    ),
    pauseReason: z.string().nullable(),
  }),
});

type QueueSnapshot = z.infer<typeof QueueSnapshot>;

export function textOf(content: { type?: unknown; text?: unknown }[]): string {
  return content
    .flatMap((block) => (block.type === 'text' ? [block.text] : []))
    .join('\n');
}

export function queueSnapshot(
  page: Page,
  httpUrl: string,
): Promise<QueueSnapshot> {
  return query({
    page,
    httpUrl,
    procedure: 'session.get',
    input: { sessionId: sessionId(page) },
    output: QueueSnapshot,
  });
}

export async function completedQueuePrompts(
  page: Page,
  httpUrl: string,
  joined: string,
): Promise<void> {
  const expected = joined.split('|');
  await expect
    .poll(
      async () =>
        (await readFeed(page, httpUrl)).filter((row) => row._meta.argo.turnEnd)
          .length,
    )
    .toBe(expected.length);

  expectPromptRows(await readFeed(page, httpUrl), expected);
}

function expectPromptRows(rows: FeedRows, expected: string[]): void {
  const prompts = rows.filter((row) => row.sessionUpdate === 'user_message');

  expect(prompts.map((row) => textOf(row.content ?? []))).toEqual(expected);
  expect(new Set(prompts.map((row) => row.turnId)).size).toBe(expected.length);
}
