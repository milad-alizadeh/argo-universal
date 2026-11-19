import { expect, it } from 'vitest';
import { AgentRelay } from './agent-relay';
import type { VoiceSay } from './call-types';
import { relayWords } from './relay-words';
import type { PromptOutcome, VoiceSessions } from './session-link';

type Heard = { said: VoiceSay[]; running: boolean[] };

type Relayed = { relay: AgentRelay; heard: Heard };

// A relay whose Session answers each Prompt with `answer`.
function relayTo(answer: () => Promise<PromptOutcome>): Relayed {
  const heard: Heard = { said: [], running: [] };

  const sessions: VoiceSessions = {
    prompt: answer,
    watch: () => (): void => {},
    notice: () => {},
  };

  const relay = new AgentRelay(sessions, 's1', {
    speak: (say): number => heard.said.push(say),
    turnsRunning: (running): number => heard.running.push(running),
  });

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
