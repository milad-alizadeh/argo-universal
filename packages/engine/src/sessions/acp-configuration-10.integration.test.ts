import { fixtureAgents } from '@repo/mocks/agent/app-fixtures';
import { scenarios } from '@repo/mocks/agent/scenarios';
import { expect, it, vi } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import { waitForAcpSnapshot } from '#mocks/acp-feed';

const configuredSessionId = 'configured-session';

it.each(fixtureAgents.map(({ agent }) => agent))(
  'malformed Argo configuration metadata is reported, counted and closes the failed opening',
  async (agentId) => {
    const sessionInput = { ...emptySessionInput, agent: agentId };
    const report = vi.spyOn(console, 'error').mockImplementation(() => {});
    const closed: { sessionId: string }[] = [];

    try {
      const host = await startAcpEngine(
        {
          steps: [],
          responses: {
            'session/new': [
              {
                result: {
                  sessionId: configuredSessionId,
                  configOptions: [
                    {
                      id: 'fast',
                      name: 'Fast mode',
                      type: 'boolean',
                      currentValue: false,
                      _meta: { argo: { tone: 'invented' } },
                    },
                  ],
                },
              },
            ],
            'session/close': [{ requests: closed }],
          },
        },
        undefined,
        agentId,
      );

      await expect(host.caller.session.new(sessionInput)).rejects.toThrow(
        'tone',
      );
      await expect
        .poll(() => closed)
        .toEqual([{ sessionId: configuredSessionId }]);
      expect(report).toHaveBeenCalledWith(
        expect.stringMatching(/Rejected Session configuration metadata #1/),
        expect.any(Error),
      );
    } finally {
      report.mockRestore();
    }
  },
);

it.each(fixtureAgents.map(({ agent }) => agent))(
  '%s delivers a held mode choice in the running Session snapshot',
  async (agent) => {
    const host = await startAcpEngine(scenarios['held-mode'], undefined, agent);

    const created = await host.caller.session.new({
      ...emptySessionInput,
      agent,
    });

    await host.caller.session.prompt({
      ...created,
      prompt: [{ type: 'text', text: 'Report a held mode choice' }],
    });

    const snapshot = await waitForAcpSnapshot(
      host,
      created.sessionId,
      (value) =>
        value.configOptions.some(
          (option) => option._meta?.argo?.heldUntilNextTurn,
        ),
    );

    expect(snapshot.state).toBe('running');
    expect(snapshot.configOptions).toMatchObject([
      { configId: 'model', currentValue: 'large' },
      { configId: 'effort', currentValue: 'high' },
      {
        configId: 'mode',
        currentValue: 'plan',
        _meta: { argo: { heldUntilNextTurn: true } },
      },
      { configId: 'fast', currentValue: false },
    ]);
  },
);
