import type { SessionUpdate } from '@agentclientprotocol/sdk';
import {
  imageReply,
  scenarios,
  sharedReply,
  type ScenarioName,
} from '@repo/mocks/agent/scenarios';
import type { ScriptedScenario } from '@repo/mocks/agent/scripted-scenario';
import { describe, expect, it, onTestFinished } from 'vitest';
import { createResourceOpening } from '#mocks/acp-resource';
import { createScriptedAgentLauncher } from '#mocks/scripted-agent';
import {
  createAcpResources,
  type AcpResources,
  type AcpSessionDestination,
  type AcpSessionLease,
} from './index';

type Played = { updates: SessionUpdate[]; questions: string[] };

const recordingDestination = (played: Played): AcpSessionDestination => ({
  update: ({ update }): undefined => {
    played.updates.push(update);
  },
  failed: () => {},
  requestPermission: ({ params: { toolCall } }) => {
    played.questions.push(`permission ${toolCall.toolCallId}`);
    return { outcome: { outcome: 'cancelled' } };
  },
  createElicitation: ({ params: { message } }) => {
    played.questions.push(`elicitation ${message}`);
    return { action: 'cancel' };
  },
});

type Scripted = {
  resources: AcpResources;
  lease: AcpSessionLease;
  played: Played;
  prompt: () => Promise<unknown>;
  cancel: () => Promise<void>;
};

const openScripted = async (scenario: ScriptedScenario): Promise<Scripted> => {
  const played: Played = { updates: [], questions: [] };
  const resources = createAcpResources({
    launchProcess: createScriptedAgentLauncher(() => scenario),
  });
  onTestFinished(() => resources.shutdown());
  const lease = await resources.open(
    createResourceOpening(recordingDestination(played)),
  );
  const prompt = (): Promise<unknown> =>
    lease.agent.request('session/prompt', {
      sessionId: lease.sessionId,
      prompt: [{ type: 'text', text: 'Start' }],
    });
  const cancel = (): Promise<void> =>
    lease.agent.notify('session/cancel', { sessionId: lease.sessionId });
  return { resources, lease, played, prompt, cancel };
};

describe('every shared scenario plays its steps to the end of the Turn', () => {
  it.each<{
    name: ScenarioName;
    reply: string;
    questions: string[];
    updates: number;
  }>([
    { name: 'reply', reply: sharedReply, questions: [], updates: 1 },
    { name: 'image', reply: imageReply, questions: [], updates: 1 },
    {
      name: 'permission',
      reply: sharedReply,
      questions: ['permission edit-readme'],
      updates: 3,
    },
    {
      name: 'elicitation',
      reply: sharedReply,
      questions: ['elicitation A few details for the new issue'],
      updates: 1,
    },
    { name: 'configuration', reply: sharedReply, questions: [], updates: 2 },
    { name: 'write-pressure', reply: sharedReply, questions: [], updates: 65 },
  ])('$name', async ({ name, reply, questions, updates }) => {
    const { played, prompt } = await openScripted(scenarios[name]);
    expect(await prompt()).toEqual({ stopReason: 'end_turn' });
    expect({
      reply: played.updates.at(-1),
      questions: played.questions,
      updates: played.updates.length,
    }).toEqual({
      reply: {
        sessionUpdate: 'agent_message_chunk',
        content: { type: 'text', text: reply },
      },
      questions,
      updates,
    });
  });
});

it('the cancel-wait scenario ends the Turn as cancelled once the Client cancels it', async () => {
  const { prompt, cancel } = await openScripted(scenarios['cancel-wait']);
  const turn = prompt();
  await cancel();
  expect(await turn).toEqual({ stopReason: 'cancelled' });
});

it('a fail step rejects the prompt with its message', async () => {
  const { prompt } = await openScripted({
    steps: [{ type: 'fail', message: 'The scripted Turn failed' }],
  });
  await expect(prompt()).rejects.toMatchObject({
    message: expect.stringContaining('The scripted Turn failed'),
  });
});

it('a hold step keeps the prompt open through cancellation until the connection closes', async () => {
  const { resources, lease, prompt, cancel } = await openScripted({
    steps: [{ type: 'hold' }],
  });
  let settled = false;
  const turn = prompt().then(
    () => (settled = true),
    () => (settled = true),
  );
  await cancel();
  await lease.agent.request('session/set_config_option', {
    sessionId: lease.sessionId,
    configId: 'absent',
    value: 'absent',
  });
  expect(settled).toBe(false);
  await resources.shutdown();
  await turn;
  expect(settled).toBe(true);
});
