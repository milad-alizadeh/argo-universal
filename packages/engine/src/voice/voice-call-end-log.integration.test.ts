import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { pause } from '#mocks/voice-timing';
import { startVoiceWork, type VoiceWork } from '#mocks/voice-work';

// What the Server's log says about Voice calls.
const voiceLog = (home: string): string =>
  readFileSync(join(home, 'logs', 'voice.log'), 'utf8');

async function endedWith(work: VoiceWork, reason: string): Promise<void> {
  await expect
    .poll(() => work.host.caller.voice.status())
    .toMatchObject({ call: null, ended: { reason } });
}

describe('the Server’s log of a call’s end', () => {
  it('says how every call ended, how long it ran and what the provider noted', async () => {
    const work = await startVoiceWork([]);
    await work.start();
    work.provider.call.note('link closed 1006');
    await pause(1100);
    work.provider.call.close('lost');
    await endedWith(work, 'provider-closed');
    await work.start();
    await work.host.caller.voice.end({ sessionId: work.sessionId });

    const log = voiceLog(work.host.home);
    const lines = log.trim().split('\n');
    expect(lines).toHaveLength(2);
    expect(lines[0]).toMatch(
      /ended: provider-closed \(lost\) after [1-9]\d*\.\d s; provider noted: link closed 1006$/,
    );
    expect(lines[1]).toMatch(/ended: person after \d+\.\d s$/);
    expect(log).toContain(work.sessionId);
  });
});
