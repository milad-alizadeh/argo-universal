import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { ToolCallUpdate } from '@repo/contracts';
import { expect, it, vi } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import { waitForAcpSessionIdle } from '#mocks/acp-feed';

const previewBytes = 64 * 1024;
const largeText = (label: string): string =>
  `${label}-head ${'x'.repeat(200_000)} ${label}-tail`;
const output = largeText('output');
const stdout = largeText('stdout');
const input = largeText('input');
const prompt = largeText('prompt');

const startToolHost = (
  update: Record<string, unknown>,
): ReturnType<typeof startAcpEngine> =>
  startAcpEngine({
    prompt: async ({ params, client }) => {
      await client.notify('session/update', {
        sessionId: params.sessionId,
        update: {
          sessionUpdate: 'tool_call',
          toolCallId: 'run-1',
          title: 'Run',
          kind: 'execute',
          status: 'completed',
          rawInput: { command: input },
          ...update,
        },
      });
      return { stopReason: 'end_turn' };
    },
  });

const readToolRow = async (
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
    expect(tail.rows).toHaveLength(2);
    return tail;
  });
  expect(page.rows[0]).toMatchObject({
    sessionUpdate: 'user_message',
    content: [{ type: 'text', text: prompt }],
  });
  const row = page.rows[1];
  if (row?.sessionUpdate !== 'tool_call_update')
    throw new Error('Tool row missing');
  return row;
};

const readBlob = async (
  host: Awaited<ReturnType<typeof startAcpEngine>>,
  blobId: string | undefined,
): Promise<unknown> =>
  JSON.parse(await readFile(join(host.blobsFolder, blobId ?? ''), 'utf8'));

it('large tool output keeps a 64 KB head and tail, marks the row truncated and stores the full output as Blobs', async () => {
  const host = await startToolHost({
    content: [{ type: 'content', content: { type: 'text', text: output } }],
    rawOutput: { stdout },
  });
  const row = await readToolRow(host);
  const [block] = row.content;
  const preview = block?.type === 'content' ? block.content : undefined;
  const text = preview?.type === 'text' ? preview.text : '';
  expect(text.startsWith('output-head')).toBe(true);
  expect(text.endsWith('output-tail')).toBe(true);
  expect(Buffer.byteLength(text)).toBeLessThanOrEqual(previewBytes + 8);
  expect(typeof row.rawOutput).toBe('string');
  expect(String(row.rawOutput)).toMatch(
    /^\{"stdout":"stdout-head[^]*stdout-tail"\}$/,
  );
  expect(row.rawInput).toEqual({ command: input });
  const meta = row._meta?.argo;
  expect(meta?.truncated).toBe(true);
  expect(meta?.fullOutput).toMatchObject({
    content: { mime: 'application/json' },
    rawOutput: { mime: 'application/json' },
  });
  expect(await readBlob(host, meta?.fullOutput?.content?.blobId)).toEqual([
    { type: 'content', content: { type: 'text', text: output } },
  ]);
  expect(await readBlob(host, meta?.fullOutput?.rawOutput?.blobId)).toEqual({
    stdout,
  });
});

it('tool output within 64 KB is stored whole without a truncation mark', async () => {
  const host = await startToolHost({
    content: [{ type: 'content', content: { type: 'text', text: 'Done' } }],
    rawOutput: { stdout: 'ok' },
  });
  const row = await readToolRow(host);
  expect(row).toMatchObject({
    content: [{ type: 'content', content: { type: 'text', text: 'Done' } }],
    rawOutput: { stdout: 'ok' },
  });
  expect(row._meta?.argo?.truncated).toBeUndefined();
  expect(row._meta?.argo?.fullOutput).toBeUndefined();
});

it('a later update replaces only the output fields it supplies', async () => {
  const host = await startAcpEngine({
    prompt: async ({ params, client }) => {
      for (const update of [
        {
          sessionUpdate: 'tool_call' as const,
          toolCallId: 'run-1',
          title: 'Run',
          status: 'in_progress' as const,
          content: [
            {
              type: 'content' as const,
              content: { type: 'text' as const, text: output },
            },
          ],
          rawOutput: { stdout },
        },
        {
          sessionUpdate: 'tool_call_update' as const,
          toolCallId: 'run-1',
          status: 'completed' as const,
          content: [
            {
              type: 'content' as const,
              content: { type: 'text' as const, text: 'Done' },
            },
          ],
        },
      ])
        await client.notify('session/update', {
          sessionId: params.sessionId,
          update,
        });
      return { stopReason: 'end_turn' };
    },
  });
  const row = await readToolRow(host);
  expect(row.content).toEqual([
    { type: 'content', content: { type: 'text', text: 'Done' } },
  ]);
  expect(String(row.rawOutput)).toMatch(/stdout-tail"\}$/);
  expect(row._meta?.argo?.truncated).toBe(true);
  expect(Object.keys(row._meta?.argo?.fullOutput ?? {})).toEqual(['rawOutput']);
});

it('a capped multibyte text keeps only whole characters', async () => {
  const wide = '€'.repeat(40_000);
  const host = await startToolHost({
    content: [{ type: 'content', content: { type: 'text', text: wide } }],
  });
  const row = await readToolRow(host);
  const [block] = row.content;
  const preview = block?.type === 'content' ? block.content : undefined;
  const text = preview?.type === 'text' ? preview.text : '';
  expect(text).not.toContain('�');
  expect(text.replaceAll('€', '')).toBe('\n…\n');
});
