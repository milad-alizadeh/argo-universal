import { expect, it, vi } from 'vitest';
import { AgentRelay } from './agent-relay';
import type { VoiceSay } from './conversation-types';
import { relayWords } from './relay-words';
import type { PromptOutcome, ConversationSessions } from './session-link';

type Heard = { said: VoiceSay[]; running: boolean[] };

type Relayed = { relay: AgentRelay; heard: Heard };

// A relay whose Session answers each Prompt with `answer`.
function relayTo(
  answer: (sessionId: string, text: string) => Promise<PromptOutcome>,
  overrides: Partial<ConversationSessions> = {},
): Relayed {
  const heard: Heard = { said: [], running: [] };

  const sessions: ConversationSessions = {
    prompt: answer,
    stop: () => Promise.resolve(false),
    answer: () => Promise.resolve('settled'),
    watch: () => (): void => {},
    notice: () => {},
    capture: () => Promise.reject(new Error('No capture in this test')),
    ...overrides,
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
    started: Promise.resolve(true),
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

    return {
      status: 'started',
      started: Promise.resolve(true),
      ended: Promise.resolve('t1'),
    };
  });

  await relay.request('r1', 'First');
  await relay.request('r2', 'Second');

  expect(prompts[1]).toMatch(/\[STATUS\][\s\S]*Second/);
});

// A Prompt that waits in the queue until `started` says whether a Turn took it.
const queuedUntil = (
  started: Promise<boolean>,
  ended: Promise<string | null> = Promise.resolve(null),
): PromptOutcome => ({ status: 'queued', notSteered: null, started, ended });

it('counts a queued Prompt as running only once its Turn starts', async () => {
  const started = Promise.withResolvers<boolean>();
  const ended = Promise.withResolvers<string | null>();

  const { relay, heard } = relayTo(async () =>
    queuedUntil(started.promise, ended.promise),
  );

  await relay.request('r1', 'Do it');
  expect(heard.running).toEqual([true, false]);

  started.resolve(true);
  await expect.poll(() => heard.running).toEqual([true, false, true]);

  ended.resolve('q1');
  await expect.poll(() => heard.running).toEqual([true, false, true, false]);
});

it('carries the voice instruction in the next Prompt when the queued one that carried it never started', async () => {
  const prompts: string[] = [];
  const outcomes = [queuedUntil(Promise.resolve(false))];

  const { relay } = relayTo(async (_sessionId, text) => {
    prompts.push(text);

    return outcomes.shift() ?? queuedUntil(Promise.resolve(true));
  });

  await relay.request('r1', 'First');
  await Promise.resolve();
  await relay.request('r2', 'Second');

  expect(prompts[1]).toMatch(/\[STATUS\][\s\S]*Second/);
});

it('carries the voice instruction only until a Prompt carrying it starts', async () => {
  const prompts: string[] = [];

  const { relay } = relayTo(async (_sessionId, text) => {
    prompts.push(text);

    return queuedUntil(Promise.resolve(true));
  });

  await relay.request('r1', 'First');
  await Promise.resolve();
  await relay.request('r2', 'Second');

  expect(prompts[1]).toBe('Second');
});

it('applies no spoken answer once the call has ended', async () => {
  const answer = vi.fn<ConversationSessions['answer']>(() =>
    Promise.resolve('answered'),
  );

  const { relay } = relayTo(() => Promise.reject(new Error('No work')), {
    answer,
  });

  relay.happened({
    type: 'permission.waiting',
    requestId: 'p1',
    agent: 'Codex',
    title: 'Run npm run deploy',
    kind: 'execute',
    target: null,
  });

  const answered = relay.request('r1', 'Allow it', 't1');
  relay.close();
  relay.personSaid({ id: 't1', text: 'Allow it', final: true });
  await answered;

  expect(answer).not.toHaveBeenCalled();
});
