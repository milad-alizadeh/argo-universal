import type {
  PromptRequest,
  SetSessionConfigOptionRequest,
} from '@agentclientprotocol/sdk';
import { newSessionInputs } from '@repo/mocks/app';
import { expect, it } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import { uploadBlob, blobsFolderIn } from '../blob';

const imageOutcome = (accepts: boolean): string =>
  accepts ? 'sent' : 'This Agent does not support image prompts';

it.each(newSessionInputs)(
  'creates an image prompt Session from the $agent App mock through ACP',
  async (input): Promise<void> => {
    const received = Promise.withResolvers<PromptRequest>();
    const settings: SetSessionConfigOptionRequest[] = [];

    const host = await startAcpEngine(
      {
        steps: [{ type: 'wait-for-cancel' }],
        configOptions: [
          { id: 'fast', name: 'Fast', type: 'boolean', currentValue: false },
        ],
        initialize: {
          protocolVersion: 1,
          agentCapabilities: {
            promptCapabilities: { image: true },
            sessionCapabilities: { close: {} },
          },
        },
        responses: {
          'session/prompt': [{ received }],
          'session/set_config_option': [
            {
              requests: settings,
              result: {
                configOptions: [
                  {
                    id: 'fast',
                    name: 'Fast',
                    type: 'boolean',
                    currentValue: true,
                  },
                ],
              },
            },
          ],
        },
      },
      undefined,
      input.agent,
    );

    const image = await uploadBlob(
      {
        databaseWriter: host.databaseWriter,
        blobsFolder: blobsFolderIn(host.home),
      },
      new Blob([new Uint8Array([137, 80, 78, 71, 1, 2, 3, 255])], {
        type: 'image/png',
      }),
    );

    const prompt = input.prompt.map((block) =>
      block.type === 'image' ? { ...block, blob: image } : block,
    );

    const { sessionId } = await host.caller.session.new({
      ...emptySessionInput,
      agent: input.agent,
      prompt,
      configOptions: [{ configId: 'fast', value: true }],
    });

    expect(settings).toEqual([
      { sessionId: 'owned-1', configId: 'fast', type: 'boolean', value: true },
    ]);
    expect(await received.promise).toEqual({
      sessionId: 'owned-1',
      prompt: [
        {
          type: 'text',
          text: 'Name the dominant color in this image in one word. Do not use tools.',
        },
        { type: 'image', mimeType: 'image/png', data: 'iVBORwECA/8=' },
      ],
    });
    expect(
      (await host.caller.feed.page({ sessionId, direction: 'tail' })).rows,
    ).toContainEqual(
      expect.objectContaining({
        sessionUpdate: 'user_message',
        content: prompt,
      }),
    );
  },
);

it.each([
  { agent: 'grok-build', accepts: true },
  { agent: 'other-agent', accepts: false },
])(
  'handles image:false for $agent without changing other Agents',
  async ({ agent, accepts }) => {
    const requests: PromptRequest[] = [];
    const received = Promise.withResolvers<PromptRequest>();

    const host = await startAcpEngine(
      {
        steps: [],
        initialize: {
          protocolVersion: 1,
          agentCapabilities: {
            promptCapabilities: {
              image: false,
              audio: false,
              embeddedContext: true,
            },
            sessionCapabilities: { close: {}, resume: {} },
          },
        },
        responses: { 'session/prompt': [{ requests, received }] },
      },
      undefined,
      agent,
    );

    const created = await host.caller.session.new({
      ...emptySessionInput,
      agent,
    });

    const blob = await uploadBlob(
      {
        databaseWriter: host.databaseWriter,
        blobsFolder: blobsFolderIn(host.home),
      },
      new Blob([new Uint8Array([137, 80, 78, 71, 1, 2, 3, 255])], {
        type: 'image/png',
      }),
    );

    const result = host.caller.session.prompt({
      ...created,
      prompt: [{ type: 'image', mimeType: 'image/png', blob }],
    });

    const outcome = await result.then(
      () => 'sent',
      (error: Error) => error.message,
    );

    expect(outcome).toBe(imageOutcome(accepts));

    if (accepts) await received.promise;

    const expected = accepts
      ? [[{ type: 'image', mimeType: 'image/png', data: 'iVBORwECA/8=' }]]
      : [];

    expect(requests.map((request) => request.prompt)).toEqual(expected);
  },
);
