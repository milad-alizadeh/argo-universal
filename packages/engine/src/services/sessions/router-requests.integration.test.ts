import type { SessionSetConfigOptionInput } from '@repo/contracts';
import { permissionOptions } from '@repo/contracts';
import { acpConfiguration } from '@repo/mocks/agent/acp-configuration';
import type { ScriptedStep } from '@repo/mocks/agent/scripted-scenario';
import { expect, it } from 'vitest';
import { startAcpEngine } from '#mocks/acp-engine';
import { waitForAcpSnapshot } from '#mocks/acp-feed';

const unofferedChoices: SessionSetConfigOptionInput[] = [
  { sessionId: 'session-1', configId: 'fast', type: 'id', value: 'true' },
  { sessionId: 'session-1', configId: 'model', type: 'id', value: 'unknown' },
];
it.each(unofferedChoices)(
  'rejects the unoffered $configId=$value choice',
  async (input) => {
    const host = await startAcpEngine({
      steps: [],
      configOptions: acpConfiguration,
    });
    await expect(
      host.caller.session.setConfigOption(input),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
  },
);

const questions: { name: string; step: ScriptedStep }[] = [
  {
    name: 'Permission',
    step: {
      type: 'permission',
      request: {
        toolCall: { toolCallId: 'current', title: 'Run a command' },
        options: permissionOptions,
      },
    },
  },
  {
    name: 'Elicitation',
    step: {
      type: 'elicitation',
      request: {
        mode: 'form',
        message: 'Choose a number',
        requestedSchema: {
          type: 'object',
          properties: { count: { type: 'integer', minimum: 1, maximum: 3 } },
          required: ['count'],
        },
      },
    },
  },
];
it.each(questions)(
  'rejects a stale $name identity without consuming its current request',
  async ({ name, step }) => {
    const host = await startAcpEngine({ steps: [step, { type: 'hold' }] });
    await host.caller.session.prompt({
      sessionId: 'session-1',
      prompt: [{ type: 'text', text: 'Start' }],
    });
    const snapshot = await waitForAcpSnapshot(host, 'session-1', (current) =>
      name === 'Permission'
        ? current.pendingPermission !== null
        : current.pendingElicitation !== null,
    );
    const pending =
      name === 'Permission'
        ? snapshot.pendingPermission
        : snapshot.pendingElicitation;
    const answer =
      name === 'Permission'
        ? host.caller.session.answerPermission({
            sessionId: 'session-1',
            requestId: 'stale',
            optionId: 'allow_once',
          })
        : host.caller.session.answerElicitation({
            sessionId: 'session-1',
            requestId: 'stale',
            action: 'accept',
            content: { count: 2 },
          });
    await expect(answer).rejects.toMatchObject({
      code: 'CONFLICT',
      message: 'already answered',
    });
    const current = await waitForAcpSnapshot(host, 'session-1', () => true);
    expect(
      name === 'Permission'
        ? current.pendingPermission
        : current.pendingElicitation,
    ).toEqual(pending);
  },
);
