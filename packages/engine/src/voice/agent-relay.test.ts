import { expect, it } from 'vitest';
import { AgentRelay } from './agent-relay';
import type { VoiceSay } from './call-types';
import { relayWords } from './relay-words';
import type { PromptOutcome, VoiceSessions } from './session-link';

type Heard = { said: VoiceSay[]; running: boolean[] };

type Relayed = { relay: AgentRelay; heard: Heard };

// A relay whose Session answers each Prompt with `answer`.
function relayTo(
  answer: (sessionId: string, text: string) => Promise<PromptOutcome>,
): Relayed {
  const heard: Heard = { said: [], running: [] };

  const sessions: VoiceSessions = {
    prompt: answer,
    stop: () => Promise.resolve(false),
    watch: () => (): void => {},
    notice: () => {},
    capture: () => Promise.reject(new Error('No capture in this test')),
  };

  const relay = new AgentRelay(
    sessions,
    { sessionId: 's1' },
    {
      speak: (say): number => heard.said.push(say),
      turnsRunning: (running): number => heard.running.push(running),
    },
  );

  return { relay, heard };
}

it('tells the voice a Prompt could not be sent, and stops counting it as running', async () => {
  const { relay, heard } = relayTo(() =>
    Promise.reject(new Error('The Session cannot be reached')),
  );

  await relay.request('r1', 'Do it');

  expect(heard.said).toEqual([
    {
      kind: 'reply',
      requestId: 'r1',
      text: relayWords.unsent('The Session cannot be reached'),
      delivery: 'speak',
    },
  ]);
  expect(heard.running).toEqual([true, false]);
});

it('keeps a sent Prompt running until the Session says its Turn ended', async () => {
  const ended = Promise.withResolvers<string | null>();

  const { relay, heard } = relayTo(async () => ({
    status: 'started',
    ended: ended.promise,
  }));

  await relay.request('r1', 'Do it');
  expect(heard.said).toMatchObject([{ text: relayWords.started }]);
  expect(heard.running).toEqual([true]);

  ended.resolve('t1');
  await expect.poll(() => heard.running).toEqual([true, false]);
});

it('carries the voice instruction in the next Prompt when the first one was not sent', async () => {
  const prompts: string[] = [];
  const refusals = ['A Hook dropped the Prompt: busy'];

  const { relay } = relayTo(async (_sessionId, text) => {
    prompts.push(text);
    const refusal = refusals.shift();

    if (refusal !== undefined) throw new Error(refusal);

    return { status: 'started', ended: Promise.resolve('t1') };
  });

  await relay.request('r1', 'First');
  await relay.request('r2', 'Second');

  expect(prompts[1]).toMatch(/\[STATUS\][\s\S]*Second/);
});
