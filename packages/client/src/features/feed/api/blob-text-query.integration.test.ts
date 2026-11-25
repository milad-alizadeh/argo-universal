import { randomBytes } from 'node:crypto';
import type { FeedPageOutput } from '@repo/contracts';
import {
  type AcpFeedUpdates,
  openAcpFeedSession,
} from '@repo/engine/mocks/acp-feed';
import { QueryClient } from '@tanstack/react-query';
import { afterEach, assert, expect, it } from 'vitest';
import { phoneOn, type Phone } from '../../../../mocks/slow-channel-client';
import { badWifi } from '../../../../mocks/slow-network';
import { blobTextQuery, createBlobTextReader } from './blob-text-query';

const phones: Phone[] = [];

afterEach(async () => {
  for (const phone of phones.splice(0)) await phone.close();
});

const whole = `output-head ${'x'.repeat(100_000)} output-tail`;

const toolCall = (index: number, text: string): AcpFeedUpdates[number] => ({
  sessionUpdate: 'tool_call',
  toolCallId: `call-${index}`,
  title: `Run ${index}`,
  kind: 'execute',
  status: 'completed',
  content: [{ type: 'content', content: { type: 'text', text } }],
});

// A Session whose tool calls returned more than a Feed row keeps: the Server holds the rest as Blobs.
async function openedFeed(
  texts: string[],
  network?: typeof badWifi,
): Promise<{
  phone: Phone;
  page: Awaited<ReturnType<Phone['client']['feed']['page']['query']>>;
  blobId: string;
}> {
  const { host, sessionId } = await openAcpFeedSession(
    texts.map((text, index) => toolCall(index, text)),
  );

  const phone = await phoneOn(host, network);

  phones.push(phone);

  const page = await phone.client.feed.page.query({
    sessionId,
    direction: 'tail',
  });

  const call = page.rows.find(
    (row) => row.sessionUpdate === 'tool_call_update',
  );

  const blobId = call?._meta?.argo?.fullOutput?.content?.blobId;

  assert(blobId);

  return { phone, page, blobId };
}

it('reads the whole output of a tool call from the Server, once, and keeps it', async () => {
  const { phone, blobId } = await openedFeed([whole]);
  let reads = 0;

  const counting: typeof fetch = (...args) => {
    reads += 1;

    return phone.media(...args);
  };

  const queryClient = new QueryClient();
  const query = blobTextQuery(createBlobTextReader(counting), blobId);

  const first = await queryClient.fetchQuery(query);
  const again = await queryClient.fetchQuery(query);

  expect(JSON.parse(first)).toEqual([
    { type: 'content', content: { type: 'text', text: whole } },
  ]);
  expect(again).toBe(first);
  expect(reads).toBe(1);
});

it('does not take an unknown Blob for an output', async () => {
  const { phone } = await openedFeed([whole]);
  const read = createBlobTextReader(phone.media);

  await expect(read('a'.repeat(64))).rejects.toThrow(/404/);
});

const toolCallCount = 12;

// Output that does not compress, as a build log does not: random bytes as text.
const heavy = (index: number): string =>
  `output-${index} ${randomBytes(150_000).toString('base64')}`;

const bytesOf = (value: FeedPageOutput): number =>
  Buffer.byteLength(JSON.stringify(value));

// The cost moves from every open to the one call that is opened: a Feed page of previews, then one whole output.
it('opens a Feed of heavy tool output small over bad Wi-Fi, and reads one whole output when it is opened', async () => {
  const { phone, page, blobId } = await openedFeed(
    Array.from({ length: toolCallCount }, (_, index) => heavy(index)),
    badWifi,
  );

  const started = performance.now();
  const text = await createBlobTextReader(phone.media)(blobId);
  const readMs = performance.now() - started;

  console.info(
    `a Feed of ${toolCallCount} tool calls of about 200 KB each over bad Wi-Fi: a page of ${bytesOf(page)} bytes; opening one call reads ${Buffer.byteLength(text)} bytes in ${Math.round(readMs)} ms`,
  );

  // A preview is at most 16 KB, and a row's own fields come to under 2 KB more.
  expect(bytesOf(page)).toBeLessThan(toolCallCount * 18_000);
  expect(Buffer.byteLength(text)).toBeGreaterThan(200_000);

  // 200 KB cannot cross a link of 500 KB/s in less than 0.4 s; a cold read (handshake included) measures about 0.8 s, and three times that is the most it may take.
  expect(readMs).toBeGreaterThanOrEqual(350);
  expect(readMs).toBeLessThan(2400);
});
