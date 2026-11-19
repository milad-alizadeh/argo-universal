import { afterEach, describe, expect, it, vi } from 'vitest';
import { usageLimited, usageUpdated } from '#mocks/gpt-live-frames';
import { heard, startedCall, type GptLiveFixture } from '#mocks/gpt-live-setup';
import type { VoiceProviderEvent } from '../provider';

let fixture: GptLiveFixture | undefined;

afterEach(async () => {
  await fixture?.close();
  fixture = undefined;
  vi.restoreAllMocks();
});

// A started call: what the fake service sends it, and everything it reports from now on.
async function listening(): Promise<{
  send: (frame: string) => void;
  events: VoiceProviderEvent[];
}> {
  const started = await startedCall();
  fixture = started;

  return {
    send: (frame) => started.endpoint.send(frame),
    events: heard(started.call),
  };
}

const limitsOf = (events: VoiceProviderEvent[]): VoiceProviderEvent[] =>
  events.filter(({ type }) => type === 'limit');

const quietly = (): ReturnType<typeof vi.spyOn> =>
  vi.spyOn(console, 'error').mockImplementation(() => {});

const rejectionLine = /^GPT-Live control link: .* #\d+$/;

describe('GPT-Live reporting the allowance', () => {
  it('reports a limit when the usage report gives the allowance a status', async () => {
    const { send, events } = await listening();

    send(usageLimited);

    await expect
      .poll(() => limitsOf(events))
      .toEqual([{ type: 'limit', remaining: 0, resetsAt: expect.any(String) }]);
  });

  it('reports no limit while the usage report gives the allowance none', async () => {
    const { send, events } = await listening();

    send(usageUpdated);
    send(usageLimited);

    await expect.poll(() => limitsOf(events)).toHaveLength(1);
  });
});

describe('GPT-Live control-link frames it cannot read', () => {
  it.each([
    ['a frame that is not JSON', '{"type":"turn.done",'],
    [
      'a known event that does not parse',
      '{"type":"turn.done","turn":{"id":"turn_1","role":"system"}}',
    ],
  ])('reports and counts %s', async (_label, frame) => {
    const reported = quietly();
    const { send } = await listening();

    send(frame);

    await expect
      .poll(() => reported.mock.calls)
      .toContainEqual([
        expect.stringMatching(rejectionLine),
        expect.anything(),
      ]);
  });

  it('ignores an event of a type it does not know', async () => {
    const reported = quietly();
    const { send, events } = await listening();

    send('{"type":"session.context.appended","item":{}}');
    send(usageLimited);

    await expect.poll(() => limitsOf(events)).toHaveLength(1);
    expect(reported).not.toHaveBeenCalled();
  });
});
