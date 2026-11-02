import type { ToolCallUpdate } from '@repo/contracts';
import { assert, expect, it, vi } from 'vitest';
import { previewBytes } from '#mocks/feed-tool-output';
import { sessionAccessHost, openAccessSession } from '#mocks/session-access';

it('caps a large Operation result in the Feed and stores its complete JSON in a Blob', async () => {
  const fixture = await sessionAccessHost();
  const session = await openAccessSession(fixture, 'Discover Argo');
  const result = await session.caller.operations.list.query();
  const row = await operationOutput(fixture.host, session.sessionId);

  assert(row._meta);
  assert(row._meta.argo);
  const meta = row._meta.argo;

  expect(meta.truncated).toBe(true);
  expect(typeof row.rawOutput).toBe('string');
  expect(Buffer.byteLength(String(row.rawOutput))).toBeLessThanOrEqual(
    previewBytes + 8,
  );
  assert(meta.fullOutput);
  const blob = meta.fullOutput.rawOutput;

  assert(blob);
  const url = `${fixture.host.url}/blobs/${blob.blobId}`;

  const read = { headers: { origin: 'app://app' } };
  await expect.poll(async () => (await fetch(url, read)).status).toBe(200);
  expect(await (await fetch(url, read)).json()).toEqual(result);
}, 30_000);

async function operationOutput(
  host: Awaited<ReturnType<typeof sessionAccessHost>>['host'],
  sessionId: string,
): Promise<ToolCallUpdate> {
  return vi.waitFor(async () => {
    const page = await host.caller.feed.page({ sessionId, direction: 'tail' });

    const row = page.rows.find(
      (item) =>
        item.sessionUpdate === 'tool_call_update' &&
        item.name === 'operations.list',
    );

    assert(row?.sessionUpdate === 'tool_call_update');

    return row;
  });
}
