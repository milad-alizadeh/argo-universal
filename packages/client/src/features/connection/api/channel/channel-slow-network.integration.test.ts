import { openAcpFeedSession } from '@repo/engine/mocks/acp-feed';
import { afterEach, expect, it } from 'vitest';
import {
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
