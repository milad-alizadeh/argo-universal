import type {
  CreateElicitationResponse,
  PromptRequest,
  RequestPermissionResponse,
} from '@agentclientprotocol/sdk';
import type { ScriptedStep } from '@repo/mocks/agent/scripted-scenario';
import { describe, expect, it } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import { waitForAcpSnapshot } from '#mocks/acp-feed';
import {
  exactOptions,
  issueSchema,
  waitForElicitation,
  waitForPermission,
  type AcpEngine,
} from './acp-requests-shared.test.mocks';

const build = 'Build the lights dashboard';

const useHue = 'Use Philips Hue';

const question = 'Which lights should the dashboard control?';

type Agent = {
  host: AcpEngine;
  sessionId: string;
  prompts: PromptRequest[];
};

const promptTexts = (prompts: readonly PromptRequest[]): string =>
  JSON.stringify(prompts.map((request) => request.prompt));

const asking = (
  elicitations: CreateElicitationResponse[],
  permissions: RequestPermissionResponse[],
): Record<'elicitation' | 'permission', ScriptedStep> => ({
  elicitation: {
    type: 'elicitation',
    request: {
      mode: 'form',
      toolCallId: 'tool-a',
      message: question,
      requestedSchema: issueSchema,
    },
    responses: elicitations,
  },
  permission: {
    type: 'permission',
    request: {
      toolCall: { toolCallId: 'tool-a', title: 'Edit tool-a' },
      options: exactOptions,
    },
    responses: permissions,
  },
});

// A Session whose first Turn stops on the given question; the follow-up Prompt is recorded and answered at once.
async function askingSession(asks: ScriptedStep): Promise<Agent> {
  const prompts: PromptRequest[] = [];

  const host = await startAcpEngine({
    steps: [],
    responses: {
      'session/prompt': [
        { prompt: build, steps: [asks], requests: prompts },
        { prompt: useHue, requests: prompts },
      ],
    },
  });

  const { sessionId } = await host.caller.session.new({
    ...emptySessionInput,
    prompt: [{ type: 'text', text: build }],
  });

  return { host, sessionId, prompts };
}

async function append({ host, sessionId }: Agent): Promise<void> {
  await host.caller.session.queue({
    sessionId,
    command: { action: 'append', prompt: [{ type: 'text', text: useHue }] },
  });
}

describe('a Prompt that reaches a Session waiting on an Elicitation (#2507)', () => {
  it('cancels the Elicitation, the Session stops waiting, and the Prompt reaches the Agent', async () => {
    const elicitations: CreateElicitationResponse[] = [];
    const agent = await askingSession(asking(elicitations, []).elicitation);

    await waitForElicitation(agent.host, agent.sessionId, question);
    await append(agent);

    await expect.poll(() => elicitations).toEqual([{ action: 'cancel' }]);
    await waitForAcpSnapshot(
      agent.host,
      agent.sessionId,
      (snapshot) => snapshot.pendingElicitation === null,
    );
    await expect.poll(() => promptTexts(agent.prompts)).toContain(useHue);
  });

  it('leaves a waiting Permission request alone', async () => {
    const permissions: RequestPermissionResponse[] = [];
    const agent = await askingSession(asking([], permissions).permission);

    await waitForPermission(agent.host, agent.sessionId);
    await append(agent);

    const snapshot = await waitForAcpSnapshot(
      agent.host,
      agent.sessionId,
      (next) => next.promptQueue.items.length > 0,
    );

    expect(snapshot.pendingPermission).not.toBeNull();
    expect(permissions).toEqual([]);
  });
});
