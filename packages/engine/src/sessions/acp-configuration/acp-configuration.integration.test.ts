import type { NewSessionRequest } from '@agentclientprotocol/sdk';
import { session } from '@repo/db/schema';
import { acpConfiguration } from '@repo/mocks/agent/acp-configuration';
import { fixtureAgents } from '@repo/mocks/agent/app-fixtures';
import { eq } from 'drizzle-orm';
import { expect, it } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';

const configuredSessionId = 'configured-session';

async function closeFeed(feed: AsyncIterator<unknown>): Promise<void> {
  await feed.return?.();
}

it.each(fixtureAgents.map(({ agent }) => agent))(
  '%s names an empty Session from its first prompt and keeps that title on later prompts',
  async (agent) => {
    const host = await startAcpEngine({ steps: [] }, undefined, agent);

    const created = await host.caller.session.new({
      ...emptySessionInput,
      agent,
    });

    await host.caller.session.prompt({
      ...created,
      prompt: [
        { type: 'text', text: '  \n Check the live list \nFull prompt' },
      ],
    });
    await expect
      .poll(
        async () =>
          (await host.caller.session.list({ archived: false })).sessions[0],
      )
      .toMatchObject({
        title: 'Check the live list',
        titleSource: 'prompt',
        status: 'unread',
      });
    await host.caller.session.prompt({
      ...created,
      prompt: [{ type: 'text', text: 'A later prompt' }],
    });
    expect(
      (await host.caller.session.list({ archived: false })).sessions[0]?.title,
    ).toBe('Check the live list');
  },
);

it.each(fixtureAgents.map(({ agent }) => agent))(
  'an empty Session shows configuration returned for its actual Checkout before any prompt',
  async (agentId) => {
    const sessionInput = { ...emptySessionInput, agent: agentId };
    const openings: NewSessionRequest[] = [];

    const host = await startAcpEngine(
      {
        steps: [],
        responses: {
          'session/new': [
            {
              requests: openings,
              result: {
                sessionId: configuredSessionId,
                configOptions: acpConfiguration.map((option) => ({
                  ...option,
                  description: 'Checkout configuration',
                })),
              },
            },
          ],
        },
      },
      undefined,
      agentId,
    );

    const created = await host.caller.session.new(sessionInput);

    const feed = (
      await host.caller.feed.subscribe({ ...created, after: null })
    )[Symbol.asyncIterator]();

    const update = await feed.next();
    expect(update.value).toMatchObject({
      type: 'snapshot',
      snapshot: {
        activeTurnId: null,
        configOptions: [
          {
            configId: 'model',
            currentValue: 'large',
            description: expect.any(String),
          },
          { configId: 'effort', currentValue: 'high' },
          { configId: 'mode', currentValue: 'code' },
          { configId: 'fast', currentValue: false },
        ],
      },
    });
    expect(openings[0]?.cwd).toBe(
      host.database
        .select({ cwd: session.checkoutPath })
        .from(session)
        .where(eq(session.id, created.sessionId))
        .get()?.cwd,
    );
    await closeFeed(feed);
  },
);
