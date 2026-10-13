import { feedScenario } from '@repo/mocks/agent/feed-scenarios';
import { assert, expect, it } from 'vitest';
import { startAcpEngine } from '#mocks/acp-engine';
import {
  previewBytes,
  output,
  stdout,
  input,
  startToolHost,
  readToolRow,
  readPreview,
  readBlob,
} from '#mocks/feed-tool-output';
it('large tool output keeps a 64 KB head and tail, marks the row truncated and stores the full output as Blobs', async () => {
  const host = await startToolHost({
    content: [{ type: 'content', content: { type: 'text', text: output } }],
    rawOutput: { stdout },
  });
  const row = await readToolRow(host);
  const text = readPreview(row);
  expect(text.startsWith('output-head')).toBe(true);
  expect(text.endsWith('output-tail')).toBe(true);
  expect(Buffer.byteLength(text)).toBeLessThanOrEqual(previewBytes + 8);
  expect(typeof row.rawOutput).toBe('string');
  expect(String(row.rawOutput)).toMatch(
    /^\{"stdout":"stdout-head[^]*stdout-tail"\}$/,
  );
  expect(row.rawInput).toEqual({ command: input });
  assert(row._meta);
  const meta = row._meta.argo;
  assert(meta);
  assert(meta.fullOutput);
  assert(meta.fullOutput.content);
  assert(meta.fullOutput.rawOutput);
  expect(meta.truncated).toBe(true);
  expect(meta.fullOutput).toMatchObject({
    content: { mime: 'application/json' },
    rawOutput: { mime: 'application/json' },
  });
  expect(await readBlob(host, meta.fullOutput.content.blobId)).toEqual([
    { type: 'content', content: { type: 'text', text: output } },
  ]);
  expect(await readBlob(host, meta.fullOutput.rawOutput.blobId)).toEqual({
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
  const { truncated, fullOutput } = row._meta?.argo ?? {};
  expect(truncated).toBeUndefined();
  expect(fullOutput).toBeUndefined();
});

it('a later update replaces only the output fields it supplies', async () => {
  const host = await startAcpEngine(
    feedScenario([
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
    ]),
  );
  const row = await readToolRow(host);
  expect(row.content).toEqual([
    { type: 'content', content: { type: 'text', text: 'Done' } },
  ]);
  expect(String(row.rawOutput)).toMatch(/stdout-tail"\}$/);
  assert(row._meta);
  const meta = row._meta.argo;
  assert(meta);
  assert(meta.fullOutput);
  expect(meta.truncated).toBe(true);
  expect(Object.keys(meta.fullOutput)).toEqual(['rawOutput']);
});

it('a capped multibyte text keeps only whole characters', async () => {
  const wide = '€'.repeat(40_000);
  const host = await startToolHost({
    content: [{ type: 'content', content: { type: 'text', text: wide } }],
  });
  const row = await readToolRow(host);
  const text = readPreview(row);
  expect(text).not.toContain('�');
  expect(text.replaceAll('€', '')).toBe('\n…\n');
});
