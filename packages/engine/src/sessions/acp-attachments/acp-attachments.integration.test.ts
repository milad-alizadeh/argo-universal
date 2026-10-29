import type { PromptRequest } from '@agentclientprotocol/sdk';
import { type ContentBlock } from '@repo/contracts';
import { fixtureAgents } from '@repo/mocks/agent/app-fixtures';
import { expect, it } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import { markdown, context, reference } from './acp-attachments.test.mocks';

it.each(fixtureAgents.map(({ agent }) => agent))(
  '%s sends complete text, context and references through shared ACP preparation',
  async (agent) => {
    const received = Promise.withResolvers<PromptRequest>();

    const host = await startAcpEngine(
      {
        steps: [],
        initialize: {
          protocolVersion: 1,
          agentCapabilities: {
            promptCapabilities: { embeddedContext: true },
            sessionCapabilities: { close: {} },
          },
        },
        responses: { 'session/prompt': [{ received }] },
      },
      undefined,
      agent,
    );

    const created = await host.caller.session.new({
      ...emptySessionInput,
      agent,
    });

    await host.caller.session.prompt({
      ...created,
      prompt: [
        {
          type: 'text',
          text: 'Read both resources',
          _meta: { acp: { source: 'human' } },
        },
        context,
        reference,
      ],
    });
    expect((await received.promise).prompt).toEqual([
      { type: 'text', text: 'Read both resources', _meta: { source: 'human' } },
      {
        type: 'resource',
        resource: {
          uri: 'file:///project/context.md',
          mimeType: markdown,
          text: '# Context\nAll supported context.\n',
        },
        _meta: { attachment: 'context' },
      },
      {
        type: 'resource_link',
        uri: 'file:///project/source.ts',
        name: 'source.ts',
        mimeType: 'text/typescript',
        title: 'Source',
        description: 'Full reference',
        size: 200,
        _meta: { attachment: 'reference' },
      },
    ]);
  },
);

it.each([
  { prompt: context, reason: 'does not support this embedded context' },
  {
    prompt: {
      type: 'unsupported',
      contentKind: 'audio',
      reason: 'unsupported',
    } satisfies ContentBlock,
    reason: 'cannot be sent as prompts',
  },
])(
  'rejects unsupported input without an ACP prompt or successful acknowledgement: $reason',
  async ({ prompt, reason }) => {
    const requests: PromptRequest[] = [];

    const host = await startAcpEngine({
      steps: [],
      responses: { 'session/prompt': [{ requests }] },
    });

    const created = await host.caller.session.new(emptySessionInput);
    await expect(
      host.caller.session.prompt({
        ...created,
        prompt: [{ type: 'text', text: 'Do not partially send' }, prompt],
      }),
    ).rejects.toThrow(reason);
    expect(requests).toEqual([]);
  },
);
