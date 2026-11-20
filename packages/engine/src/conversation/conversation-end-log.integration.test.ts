import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { pause } from '#mocks/conversation-timing';
import {
  startConversationWork,
  type ConversationWork,
} from '#mocks/conversation-work';

// What the Server's log says about Conversations.
const conversationLog = (home: string): string =>
  readFileSync(join(home, 'logs', 'voice.log'), 'utf8');

async function endedWith(
  work: ConversationWork,
  reason: string,
): Promise<void> {
  await expect
    .poll(() => work.host.caller.conversation.status())
    .toMatchObject({ call: null, ended: { reason } });
}

describe('the Server’s log of a call’s end', () => {
  it('says how every call ended, how long it ran and what the provider noted', async () => {
    const work = await startConversationWork([]);
    await work.start();
    work.provider.call.note('link closed 1006');
    await pause(1100);
    work.provider.call.close('lost');
    await endedWith(work, 'provider-closed');
    await work.start();
    await work.host.caller.conversation.end({ sessionId: work.sessionId });

    const log = conversationLog(work.host.home);
    const lines = log.trim().split('\n');
    expect(lines).toHaveLength(2);
    expect(lines[0]).toMatch(
      /ended: provider-closed \(lost\) after [1-9]\d*\.\d s; provider noted: link closed 1006$/,
    );
    expect(lines[1]).toMatch(/ended: person after \d+\.\d s$/);
    expect(log).toContain(work.sessionId);
  });
});
