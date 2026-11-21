import { afterEach, describe, expect, it } from 'vitest';
import {
  fixtureOf,
  request,
  signedIn,
  type GptLiveFixture,
} from '#mocks/gpt-live-setup';
import type { ConversationStartRequest } from '../provider';

let fixture: GptLiveFixture | undefined;

afterEach(async () => {
  await fixture?.close();
  fixture = undefined;
});

// The session the fake service was asked to create the call with.
const createdSession = (): object | undefined =>
  fixture?.endpoint.created.at(0)?.session;

const style = 'Speaks like a cheerful pirate.';

const custom = 'Call me Sam.';

// What the voice was told when its call was created.
async function instructionsSent(
  setup: Partial<ConversationStartRequest>,
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

  it('tells the voice to hand a "stop" over as it was said', async () => {
    const told = await instructionsSent({});

    expect(told).toMatch(/"stop"[^.]*exactly/i);
  });

  it('hands an answer in an Agent-led interview back to the Agent, even when it is short', async () => {
    const told = await instructionsSent({});

    expect(told).toMatch(
      /(?:Agent's question|interview with the Agent)[^.]*hand[^.]*"yes" or "okay"/i,
    );
    expect(told).toMatch(
      /wait for the Agent's next question and say it aloud/i,
    );
  });

  it('hands over goodbye and distinguishes ending the call from pausing the interview', async () => {
    const told = await instructionsSent({});

    expect(told).toMatch(/hand over[^.]*end the Conversation[^.]*goodbye/i);
    expect(told).toMatch(
      /hand over[^.]*pause or wait[^.]*Conversation stays open/i,
    );
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

  it('turns the filler off and seeds the opening as a developer message, as the service honours them', async () => {
    await instructionsSent({ filler: false, opening: 'Greet me as Sam.' });

    expect(fixture?.endpoint.created.at(0)?.session).toMatchObject({
      delegation: { type: 'client', ack_filler: false },
      initial_items: [
        {
          type: 'message',
          role: 'developer',
          content: [{ type: 'input_text', text: 'Greet me as Sam.' }],
        },
      ],
    });
  });

  it('sends no opening when there is none', async () => {
    await instructionsSent({ filler: true });

    const session = createdSession();

    expect(session).toMatchObject({
      delegation: { type: 'client', ack_filler: true },
    });
    expect(session).not.toHaveProperty('initial_items');
  });

  it('adds nothing for a style or instructions the person did not give', async () => {
    const told = await instructionsSent({});

    expect(told).not.toMatch(/speak:|instructions:/i);
    expect(told.endsWith(request.briefing)).toBe(true);
  });
});
