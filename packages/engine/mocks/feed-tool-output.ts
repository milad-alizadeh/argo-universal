import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { SessionUpdate } from '@agentclientprotocol/sdk';
import type { SessionUpdate as FeedRow } from '@repo/contracts';
import type { ToolCallUpdate } from '@repo/contracts';
import { feedScenario } from '@repo/mocks/agent/feed-scenarios';
import { assert, expect, vi } from 'vitest';
import { emptySessionInput, startAcpEngine } from './acp-engine';
import { waitForAcpSessionIdle } from './acp-feed';

export const previewBytes = 64 * 1024;

const largeText = (label: string): string =>
  `${label}-head ${'x'.repeat(200_000)} ${label}-tail`;

export const output = largeText('output');

export const stdout = largeText('stdout');

export const input = largeText('input');

const prompt = largeText('prompt');

const toolCall: Extract<SessionUpdate, { sessionUpdate: 'tool_call' }> = {
  sessionUpdate: 'tool_call',
  toolCallId: 'run-1',
  title: 'Run',
  kind: 'execute',
  status: 'completed',
  rawInput: { command: input },
};

export const startToolHost = (
  update: Partial<typeof toolCall>,
): ReturnType<typeof startAcpEngine> =>
  startAcpEngine(feedScenario([{ ...toolCall, ...update }]));

export const readToolRow = async (
  host: Awaited<ReturnType<typeof startAcpEngine>>,
): Promise<ToolCallUpdate> => {
  const created = await host.caller.session.new({
    ...emptySessionInput,
    prompt: [{ type: 'text', text: prompt }],
  });

  await waitForAcpSessionIdle(host, created.sessionId);

  // A row showing a Blob is stored once the Blob file is written.
  const page = await vi.waitFor(async () => {
    const tail = await host.caller.feed.page({ ...created, direction: 'tail' });
    expect(tail.rows).toHaveLength(3);

    return tail;
  });

  return requireToolRow(page.rows);
};

const requireToolRow = (rows: readonly FeedRow[]): ToolCallUpdate => {
  expect(rows[0]).toMatchObject({
    sessionUpdate: 'user_message',
    content: [{ type: 'text', text: prompt }],
  });
  const row = rows[1];

  if (row?.sessionUpdate !== 'tool_call_update')
    throw new Error('Tool row missing');

  return row;
};

export const readPreview = (row: ToolCallUpdate): string => {
  const [block] = row.content;
  assert(block?.type === 'content');
  assert(block.content.type === 'text');

  return block.content.text;
};

export const readBlobText = (
  host: Awaited<ReturnType<typeof startAcpEngine>>,
  blobId: string | undefined,
): Promise<string> => readFile(join(host.blobsFolder, blobId ?? ''), 'utf8');
