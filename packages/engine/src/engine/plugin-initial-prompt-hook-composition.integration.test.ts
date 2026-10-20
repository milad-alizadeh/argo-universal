import type { PromptRequest } from '@agentclientprotocol/sdk';
import { expect, it } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import {
  hookRecords,
  recordingSource,
  writeHookPlugins,
} from '#mocks/hook-plugins';

it('passes the Project to a Hook on the initial prompt before it reaches the Agent', async () => {
  const requests: PromptRequest[] = [];
  const prompt = [{ type: 'text' as const, text: 'Hello' }];

  const host = await startAcpEngine({
    steps: [],
    responses: { 'session/prompt': [{ requests }] },
    installPlugins: (home) =>
      writeHookPlugins(home, [
        {
          id: 'recorder',
          hooks: ['prompt.submit'],
          source:
            recordingSource(`await on('prompt.submit', (ctx, event, next) =>
        next({ ...event, prompt: [{ type: 'text', text: '[' + event.projectId + '] ' + event.prompt[0].text }] }));`),
        },
      ]),
  });

  const { sessionId } = await host.caller.session.new({
    ...emptySessionInput,
    prompt,
  });

  await expect
    .poll(() => requests.map((request) => request.prompt))
    .toEqual([[{ type: 'text', text: '[project-1] Hello' }]]);
  expect(await hookRecords(host.home, 'recorder')).toMatchObject([
    {
      name: 'prompt.submit',
      event: { sessionId, projectId: 'project-1', prompt },
    },
  ]);
}, 20_000);
