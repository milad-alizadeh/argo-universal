import { openAcpFeedSession } from '@repo/engine/mocks/acp-feed';
import { afterEach, expect, it } from 'vitest';
import {
  catchUpMs,
  coldOpenMs,
  firstPageMs,
  phoneOn,
  type Phone,
} from '../../../../../mocks/slow-channel-client';
import { badWifi } from '../../../../../mocks/slow-network';

const phones: Phone[] = [];

afterEach(async () => {
  for (const phone of phones.splice(0)) await phone.close();
});

const messageCount = 60;

const paragraph =
  'A line of an Agent reply, long enough to cost bytes. '.repeat(40);

const seeded = Array.from({ length: messageCount }, (_, index) => ({
  sessionUpdate: 'agent_message_chunk' as const,
  messageId: `message-${index}`,
  content: { type: 'text' as const, text: `${index}: ${paragraph}` },
}));

// Opening the socket, the handshake and the request each cross bad Wi-Fi's 60 ms each way at least once: the profile's own floor, whatever the machine's speed.
const floorMs = 3 * (60 + 60);

/*
 * The baseline a transport change is measured against: how long a phone waits for the first page of a Feed on bad Wi-Fi, from a new channel (handshake included) to the rows. Run it alone with `pnpm --filter @repo/client exec vitest run channel-slow-network --disableConsoleIntercept` and read the line it prints.
 */
it('records how long the first page takes over bad Wi-Fi', async () => {
  const { host, sessionId } = await openAcpFeedSession(seeded);
  const direct = await phoneOn(host);
  const slow = await phoneOn(host, badWifi);

  phones.push(direct, slow);

  const fast = await firstPageMs(direct, sessionId);
  const onBadWifi = await firstPageMs(slow, sessionId);

  console.info(
    `first page of ${messageCount} seeded messages: ${Math.round(fast.ms)} ms direct, ${Math.round(onBadWifi.ms)} ms over bad Wi-Fi`,
  );

  expect(onBadWifi.rows).toBeGreaterThan(20);
  expect(onBadWifi.ms).toBeGreaterThanOrEqual(floorMs);
  expect(onBadWifi.ms).toBeLessThan(30_000);
});

// A cold open crosses the link once, for the subscription, not twice for a page and then a subscription.
it('opens a Feed the App holds nothing of in one round trip over bad Wi-Fi', async () => {
  const { host, sessionId } = await openAcpFeedSession(seeded);
  const before = await phoneOn(host, badWifi);
  const after = await phoneOn(host, badWifi);

  phones.push(before, after);

  const twoTrips = await coldOpenMs(before, sessionId, 'page-then-subscribe');
  const oneTrip = await coldOpenMs(after, sessionId, 'subscription-only');

  console.info(
    `cold open over bad Wi-Fi: ${Math.round(twoTrips.ms)} ms with a page then a subscription, ${Math.round(oneTrip.ms)} ms with the subscription alone`,
  );

  expect(oneTrip.rows).toBe(twoTrips.rows);
  expect(oneTrip.rows).toBeLessThanOrEqual(40);
  expect(oneTrip.ms).toBeLessThan(twoTrips.ms);
});

const manyShort = Array.from({ length: 400 }, (_, index) => ({
  sessionUpdate: 'agent_message_chunk' as const,
  messageId: `short-${index}`,
  content: { type: 'text' as const, text: `Short reply ${index}.` },
}));

// A reconnect that catches up on many rows sends batches, not a message per row.
it('catches up on many rows in far fewer messages over bad Wi-Fi', async () => {
  const { host, sessionId } = await openAcpFeedSession(manyShort);
  const before = await phoneOn(host, badWifi);
  const after = await phoneOn(host, badWifi);

  phones.push(before, after);

  const perRow = await catchUpMs(before, sessionId, false);
  const batched = await catchUpMs(after, sessionId, true);

  console.info(
    `catch-up of ${perRow.rows} rows over bad Wi-Fi: ${perRow.messages} messages in ${Math.round(perRow.ms)} ms per row, ${batched.messages} messages in ${Math.round(batched.ms)} ms in batches`,
  );

  expect(batched.rows).toBe(perRow.rows);
  expect(batched.messages).toBeLessThan(perRow.messages / 4);
});
