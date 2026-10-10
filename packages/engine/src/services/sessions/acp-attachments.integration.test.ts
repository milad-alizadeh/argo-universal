import type { PromptRequest } from '@agentclientprotocol/sdk';
import { agentAdapters } from '@repo/agents';
import type { ContentBlock } from '@repo/contracts';
import { expect, it } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';

const context: ContentBlock = {
  type: 'resource',
  resource: {
    uri: 'file:///project/context.md',
    mimeType: 'text/markdown',
    text: '# Context\nAll supported context.\n',
  },
  _meta: { acp: { attachment: 'context' } },
};
const reference: ContentBlock = {
  type: 'resource_link',
  uri: 'file:///project/source.ts',
  name: 'source.ts',
  mimeType: 'text/typescript',
  title: 'Source',
  description: 'Full reference',
  size: 200,
  _meta: { acp: { attachment: 'reference' } },
};
it.each(agentAdapters.map(({ agent }) => agent))(
  '%s sends complete text, context and references through shared ACP preparation',
  async (agent) => {
    const received = Promise.withResolvers<PromptRequest>();
    const host = await startAcpEngine(
      {
        initialize: () => ({
          protocolVersion: 1,
          agentCapabilities: {
            promptCapabilities: { embeddedContext: true },
            sessionCapabilities: { close: {} },
          },
        }),
        prompt: ({ params }) => {
          received.resolve(params);
          return { stopReason: 'end_turn' };
        },
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
          mimeType: 'text/markdown',
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
      prompt: ({ params }) => {
        requests.push(params);
        return { stopReason: 'end_turn' };
      },
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
