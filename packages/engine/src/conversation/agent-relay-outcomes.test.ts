import { expect, it } from 'vitest';
import { AgentRelay } from './agent-relay';
import type { ConversationSessions, PromptOutcome } from './session-link';

interface Answering {
  relay: AgentRelay;
  texts: string[];
  running: boolean[];
}

// A relay whose Session answers each Prompt with the next outcome; it records the texts sent and what is running.
function relayAnswering(outcomes: PromptOutcome[]): Answering {
  const texts: string[] = [];
  const running: boolean[] = [];

  const sessions: ConversationSessions = {
    prompt: (_sessionId, text) => {
      texts.push(text);

      const outcome = outcomes[texts.length - 1];

      return outcome
        ? Promise.resolve(outcome)
        : Promise.reject(new Error('No outcome left'));
    },
    stop: () => Promise.resolve(false),
    answer: () => Promise.resolve('settled'),
    watch: () => (): void => {},
    notice: (): void => {},
    capture: () => Promise.reject(new Error('No capture in this test')),
  };

  const relay = new AgentRelay(
    sessions,
    { sessionId: 's1' },
    {
      speak: (): void => {},
      turnsRunning: (now): number => running.push(now),
      hangUp: (): void => {},
    },
  );

  return { relay, texts, running };
}

it('stops counting a started Prompt whose Turn ended with no id', async () => {
  const { relay, running } = relayAnswering([
    {
      status: 'started',
      started: Promise.resolve(true),
      ended: Promise.resolve(null),
    },
  ]);

  await relay.request('r1', 'Do it');
  await expect.poll(() => running).toEqual([true, false]);
});

it('carries the voice instruction again when a started Prompt reports no Turn started', async () => {
  const { relay, texts } = relayAnswering([
    {
      status: 'steered',
      started: Promise.resolve(false),
      ended: Promise.resolve(null),
    },
    {
      status: 'started',
      started: Promise.resolve(true),
      ended: Promise.resolve(null),
    },
  ]);

  await relay.request('r1', 'First');
  await relay.request('r2', 'Second');

  expect(texts[1]).not.toBe('Second');
});
