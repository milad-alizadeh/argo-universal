import type { PromptRequest } from '@agentclientprotocol/sdk';
import { SessionNewOutput } from '@repo/contracts';
import { OperationExecution } from '@repo/contracts/operations';
import { expect, it } from 'vitest';
import { emptySessionInput } from '#mocks/acp-engine';
import { waitForAcpSessionIdle } from '#mocks/acp-feed';
import { runOperation } from '#mocks/operations';
import { delegationJourney } from '#mocks/session-delegation';

const humanText =
  'Ask the Started Session to run the implement skill for #12345';

const setupText = 'Prepare the destination';

const argumentsText = '#12345';

const skillName = 'implement';

it('requires the App to confirm a native command and carries its source Turn into the destination Feed', async () => {
  const gate = Promise.withResolvers<void>();
  const invoked: PromptRequest[] = [];

  const { host, caller } = await delegationJourney({
    replies: [
      { prompt: humanText, steps: [{ type: 'gate', waitFor: gate.promise }] },
      {
        prompt: setupText,
        steps: [
          {
            type: 'update',
            update: {
              sessionUpdate: 'available_commands_update',
              availableCommands: [
                { name: skillName, description: 'Implement an issue' },
              ],
            },
          },
        ],
      },
      { prompt: '/implement #12345', requests: invoked },
    ],
  });

  try {
    await host.caller.session.prompt({
      sessionId: caller.sessionId,
      prompt: [{ type: 'text', text: humanText }],
    });

    const starter = await host.caller.session.get({
      sessionId: caller.sessionId,
    });

    const started = OperationExecution.parse(
      await runOperation(caller.caller.operations, {
        id: 'session.new',
        params: {
          ...emptySessionInput,
          prompt: [{ type: 'text', text: setupText }],
        },
        wait: true,
      }),
    );

    const destination = SessionNewOutput.parse(started.result);

    await expect(
      runOperation(caller.caller.operations, {
        id: 'session.offerSkill',
        params: {
          ...destination,
          starterId: 'forged',
          name: skillName,
          arguments: argumentsText,
        },
      }),
    ).resolves.toEqual({});

    const reader = new AbortController();

    const stream = (
      await host
        .createCaller({ signal: reader.signal })
        .session.delegatedAttention(destination)
    )[Symbol.asyncIterator]();

    try {
      const attention = await stream.next();
      const offer = attention.value?.skills[0];
      expect(offer).toMatchObject({
        starterId: caller.sessionId,
        originTurnId: starter.activeTurnId,
      });

      if (!offer) throw new Error('No skill offer');
      const params = { ...destination, offerId: offer.id };

      await expect(
        runOperation(caller.caller.operations, {
          id: 'session.confirmSkill',
          params,
        }),
      ).rejects.toThrow('Only an App can run');
      expect(invoked).toEqual([]);

      await host.caller.session.confirmSkill(params);
      await host.caller.session.confirmSkill(params);
      await waitForAcpSessionIdle(host, destination.sessionId);
      expect(invoked.map(({ prompt }) => prompt)).toEqual([
        [{ type: 'text', text: '/implement #12345' }],
      ]);

      const page = await host.caller.feed.page({
        ...destination,
        direction: 'tail',
      });

      expect(page.rows).toContainEqual(
        expect.objectContaining({
          sessionUpdate: 'prompt_message',
          _meta: {
            argo: {
              sender: expect.objectContaining({
                type: 'skill',
                sessionId: caller.sessionId,
                originTurnId: starter.activeTurnId,
              }),
            },
          },
        }),
      );
    } finally {
      reader.abort();
      await stream.return?.();
    }
  } finally {
    gate.resolve();
  }
}, 30_000);
