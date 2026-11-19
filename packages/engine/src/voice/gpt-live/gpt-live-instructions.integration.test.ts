import { afterEach, describe, expect, it } from 'vitest';
import {
  fixtureOf,
  request,
  signedIn,
  type GptLiveFixture,
} from '#mocks/gpt-live-setup';
import type { VoiceStartRequest } from '../provider';

let fixture: GptLiveFixture | undefined;

afterEach(async () => {
  await fixture?.close();
  fixture = undefined;
});

const style = 'Speaks like a cheerful pirate.';

const custom = 'Call me Sam.';

// What the voice was told when its call was created.
async function instructionsSent(
  setup: Partial<VoiceStartRequest>,
): Promise<string> {
  fixture = await fixtureOf([signedIn('t1')], ['t1']);
  await fixture.start({ ...request, ...setup });

  return fixture.endpoint.created.at(0)?.session.instructions ?? '';
}

describe('What a GPT-Live call is told', () => {
  it("puts Argo's own instructions first, then the voice's style, the custom instructions, and the briefing last", async () => {
    const told = await instructionsSent({ style, instructions: custom });

    expect(told).toMatch(/^Your name is Argo\./);

    const order = [
      told.indexOf('Hand the person'),
      told.indexOf(style),
      told.indexOf(custom),
      told.indexOf(request.briefing),
    ];

    expect(order.every((at) => at > 0)).toBe(true);
    expect(order).toEqual([...order].sort((a, b) => a - b));
  });

  it("speaks with a custom voice's base voice", async () => {
    await instructionsSent({ voice: 'sol', style });

    expect(fixture?.endpoint.created.at(0)?.session.audio).toEqual({
      output: { voice: 'sol' },
    });
  });

  it("previews a custom voice in its style, and without Argo's call instructions", async () => {
    fixture = await fixtureOf([signedIn('t1')], ['t1']);

    const preview = await fixture.provider.preview({
      offer: 'v=0 listening offer',
      voice: 'sol',
      style,
      words: 'Hi',
    });

    preview.end();

    const told = fixture.endpoint.created.at(0)?.session.instructions;

    expect(told).toContain(style);
    expect(told).not.toContain('coding Agent');
  });

  it('adds nothing for a style or instructions the person did not give', async () => {
    const told = await instructionsSent({});

    expect(told).not.toMatch(/speak:|instructions:/i);
    expect(told.endsWith(request.briefing)).toBe(true);
  });
});
