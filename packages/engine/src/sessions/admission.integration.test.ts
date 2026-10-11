import type { PromptRequest } from '@agentclientprotocol/sdk';
import { agentAdapters } from '@repo/agents';
import { session } from '@repo/db/schema';
import { eq } from 'drizzle-orm';
import { expect, it } from 'vitest';
import { startAcpEngine } from '#mocks/acp-engine';

const identities = agentAdapters.map(({ agent }) => agent);
const prompt = [{ type: 'text', text: 'Continue' }] as const;

it.each(identities)(
  'keeps the admitted %s Session eligible after an unsupported stored reparent',
  async (agent) => {
    const requests: PromptRequest[] = [];
    const host = await startAcpEngine(
      {
        steps: [{ type: 'wait-for-cancel' }],
        configOptions: [
          { id: 'fast', name: 'Fast', type: 'boolean', currentValue: false },
        ],
        responses: { 'session/prompt': [{ requests }] },
      },
      undefined,
      agent,
    );
    host.database.update(session).set({ agent }).run();
    await host.caller.session.setConfigOption({
      sessionId: 'session-1',
      configId: 'fast',
      type: 'boolean',
      value: false,
    });
    host.database
      .update(session)
      .set({ parentSessionId: 'session-1' })
      .where(eq(session.id, 'session-1'))
      .run();
    const acknowledgement = await host.caller.session.prompt({
      sessionId: 'session-1',
      prompt: [...prompt],
    });
    expect(acknowledgement.messageId).toEqual(expect.any(String));
    await expect
      .poll(() => requests)
      .toEqual([{ sessionId: 'owned-1', prompt: [...prompt] }]);
  },
);

type JourneyCaller = Awaited<ReturnType<typeof startAcpEngine>>['caller'];

const absentCommands = [
  {
    name: 'cancel',
    code: 'NOT_FOUND',
    message: 'No Session session-1',
    call: (
      caller: JourneyCaller,
    ): ReturnType<JourneyCaller['session']['cancel']> =>
      caller.session.cancel({ sessionId: 'session-1' }),
  },
  {
    name: 'Permission answer',
    code: 'CONFLICT',
    message: 'already answered',
    call: (
      caller: JourneyCaller,
    ): ReturnType<JourneyCaller['session']['answerPermission']> =>
      caller.session.answerPermission({
        sessionId: 'session-1',
        requestId: 'stale',
        optionId: 'allow_once',
      }),
  },
  {
    name: 'Elicitation answer',
    code: 'CONFLICT',
    message: 'already answered',
    call: (
      caller: JourneyCaller,
    ): ReturnType<JourneyCaller['session']['answerElicitation']> =>
      caller.session.answerElicitation({
        sessionId: 'session-1',
        requestId: 'stale',
        action: 'cancel',
      }),
  },
];

it.each(
  identities.flatMap((agent) =>
    absentCommands.map((command) => ({ ...command, agent })),
  ),
)(
  'rejects an absent $agent Session $name without starting Agent work',
  async ({ agent, code, message, call }) => {
    const host = await startAcpEngine({ steps: [] }, undefined, agent);
    host.database.update(session).set({ agent }).run();
    await expect(call(host.caller)).rejects.toMatchObject({ code, message });
    expect(host.agent.processes).toHaveLength(0);
  },
);
