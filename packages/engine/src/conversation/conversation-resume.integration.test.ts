import type { PromptRequest } from '@agentclientprotocol/sdk';
import { expect, it } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import { waitForAcpSessionIdle } from '#mocks/acp-feed';
import { offer } from '#mocks/conversation-engine';
import { promptText } from '#mocks/conversation-work';
import { FakeConversationProvider } from './fake-provider';

const decision = 'Terminal opens the current Run. New Terminal opens a shell.';

const outstanding = 'The desktop and phone designs still need approval.';

const unrelated = 'A decision in another Session.';

async function startHistory(): Promise<{
  host: Awaited<ReturnType<typeof startAcpEngine>>;
  sessionId: string;
  scenario: NonNullable<Parameters<typeof startAcpEngine>[0]>;
  provider: FakeConversationProvider;
  prompts: PromptRequest[];
}> {
  const provider = new FakeConversationProvider({ connect: 'manual' });
  const prompts: PromptRequest[] = [];

  const scenario = {
    steps: [],
    responses: { 'session/prompt': [{ requests: prompts }] },
  };

  const host = await startAcpEngine({
    ...scenario,
    conversationProvider: provider,
  });

  const { sessionId } = await host.caller.session.new({
    ...emptySessionInput,
    prompt: [{ type: 'text', text: 'Review designs and investigate sign-in.' }],
  });

  await waitForAcpSessionIdle(host, sessionId);
  const other = await host.caller.session.new(emptySessionInput);
  await host.caller.conversation.start({ sessionId: other.sessionId, offer });
  provider.call.personSays(unrelated);
  await host.caller.conversation.end({ sessionId: other.sessionId });
  await host.caller.conversation.start({ sessionId, offer });
  provider.call.connect();
  provider.call.personSays(decision);
  provider.call.voiceSays(outstanding);

  return { host, sessionId, scenario, provider, prompts };
}

it.each(['new call', 'Server restart and replacement provider'])(
  'briefs both the voice and the Agent after a %s',
  async (resume) => {
    const history = await startHistory();

    for (let index = 0; index < 20; index++) {
      history.provider.call.personSays(
        `Sign-in topic ${index}: ${'Investigating OAuth registrations. '.repeat(40)}`,
        `sign-in-${index}`,
      );
    }

    const { sessionId } = history;
    let { host, provider } = history;

    if (resume === 'new call') {
      await host.caller.conversation.end({ sessionId });
    } else {
      await host.stop();
      provider = new FakeConversationProvider({ connect: 'manual' });
      host = await startAcpEngine({
        ...history.scenario,
        conversationProvider: provider,
        restartOver: host.home,
      });
      await host.caller.session.open({ sessionId });
    }

    await host.caller.conversation.start({ sessionId, offer });
    provider.call.connect();
    provider.call.requestWork('continue', 'Continue.');
    await expect.poll(() => history.prompts).toHaveLength(2);

    const briefing = provider.call.request.briefing;
    const prompt = promptText(history.prompts.at(-1));

    expect
      .soft(briefing)
      .toMatch(
        /Terminal opens the current Run[\s\S]+The desktop and phone designs still need approval[\s\S]+Sign-in topic 19:/,
      );
    expect.soft(briefing).not.toContain(unrelated);
    expect.soft(prompt).toContain(decision);
    expect.soft(prompt).toContain(outstanding);
    expect.soft(prompt).toContain('Sign-in topic 19:');
    expect.soft(prompt).not.toContain(unrelated);
    expect(prompt).toContain('Continue.');

    const { rows } = await host.caller.feed.page({
      sessionId,
      direction: 'tail',
    });

    const sent = rows.findLast((row) => row.sessionUpdate === 'prompt_message');
    expect(JSON.stringify(sent)).not.toContain(decision);
  },
);

it('hands over new dialogue on a short request after control reconnect', async () => {
  const { sessionId, host, provider, prompts } = await startHistory();
  provider.call.requestWork('first', 'Review the desktop design.');
  await expect.poll(() => prompts).toHaveLength(2);
  expect(promptText(prompts.at(-1))).toContain(decision);
  await waitForAcpSessionIdle(host, sessionId);

  provider.call.emit({ type: 'status', status: 'disconnected' });
  provider.call.connect();
  provider.call.personSays('Use the same header on phone.', 'follow-up');
  provider.call.requestWork('next', 'Continue.');
  await expect.poll(() => prompts).toHaveLength(3);

  const prompt = promptText(prompts.at(-1));
  expect(prompt).toContain('Use the same header on phone.');
  expect(prompt).toContain('Continue.');
  expect(prompt).not.toContain(decision);
});

it('starts fresh after clearing the Agent context', async () => {
  const { sessionId, host, provider, prompts } = await startHistory();
  await host.caller.conversation.end({ sessionId });
  await host.caller.session.clear({ sessionId });
  await host.caller.conversation.start({ sessionId, offer });
  provider.call.connect();
  provider.call.requestWork('fresh', 'Start fresh.');
  await expect.poll(() => prompts).toHaveLength(2);

  expect(provider.call.request.briefing).not.toContain(decision);
  expect(promptText(prompts.at(-1))).not.toContain(decision);
});
