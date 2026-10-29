import type { PromptRequest } from '@agentclientprotocol/sdk';
import { acpConfiguration } from '@repo/mocks/agent/acp-configuration';
import { fixtureAgents } from '@repo/mocks/agent/app-fixtures';
import { expect, it } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import { waitForAcpSessionIdle } from '#mocks/acp-feed';

const configuredSessionId = 'configured-session';

const unavailableModel = 'Model unavailable';

const cancellationPrompt = 'Wait for cancellation';

it.each(fixtureAgents.map(({ agent }) => agent))(
  'an upstream configuration rejection leaves the Session actual values unchanged',
  async (agentId) => {
    const sessionInput = { ...emptySessionInput, agent: agentId };

    const host = await startAcpEngine(
      {
        steps: [],
        configOptions: acpConfiguration,
        sessionIds: [configuredSessionId],
        responses: {
          'session/set_config_option': [
            { error: { code: -32602, message: unavailableModel } },
          ],
        },
      },
      undefined,
      agentId,
    );

    const created = await host.caller.session.new(sessionInput);
    await expect(
      host.caller.session.setConfigOption({
        ...created,
        configId: 'model',
        type: 'id',
        value: 'small',
      }),
    ).rejects.toThrow(unavailableModel);

    const feed = (
      await host.caller.feed.subscribe({ ...created, after: null })
    )[Symbol.asyncIterator]();

    expect((await feed.next()).value).toMatchObject({
      type: 'snapshot',
      snapshot: {
        configOptions: [
          { configId: 'model', currentValue: 'large' },
          {},
          {},
          { configId: 'fast', currentValue: false },
        ],
      },
    });
    await feed.return?.();
  },
);

it.each(fixtureAgents.map(({ agent }) => agent))(
  'cancellation bypasses configuration held behind an active prompt',
  async (agentId) => {
    const sessionInput = { ...emptySessionInput, agent: agentId };
    const prompted = Promise.withResolvers<PromptRequest>();
    const commands: { sessionId: string }[] = [];

    const host = await startAcpEngine(
      {
        steps: [{ type: 'wait-for-cancel' }],
        configOptions: acpConfiguration,
        sessionIds: [configuredSessionId],
        responses: {
          'session/prompt': [
            {
              requests: commands,
              received: prompted,
              steps: [{ type: 'wait-for-cancel' }],
              result: { stopReason: 'cancelled' },
            },
          ],
          'session/set_config_option': [{ requests: commands }],
        },
        notifications: { 'session/cancel': { requests: commands } },
      },
      undefined,
      agentId,
    );

    const created = await host.caller.session.new(sessionInput);
    await host.caller.session.prompt({
      ...created,
      prompt: [{ type: 'text', text: cancellationPrompt }],
    });
    await prompted.promise;

    const setting = host.caller.session.setConfigOption({
      ...created,
      configId: 'mode',
      type: 'id',
      value: 'plan',
    });

    await host.caller.session.cancel(created);
    await setting;
    await waitForAcpSessionIdle(host, created.sessionId);
    expect(commands).toMatchObject([
      { prompt: [{ text: cancellationPrompt }] },
      { sessionId: configuredSessionId },
    ]);
    expect(commands).toHaveLength(2);
    await host.caller.session.prompt({
      ...created,
      prompt: [{ type: 'text', text: 'Continue with held mode' }],
    });
    await expect
      .poll(() => commands)
      .toMatchObject([
        { prompt: [{ text: cancellationPrompt }] },
        { sessionId: configuredSessionId },
        { configId: 'mode', value: 'plan' },
        { prompt: [{ text: 'Continue with held mode' }] },
      ]);
  },
);
