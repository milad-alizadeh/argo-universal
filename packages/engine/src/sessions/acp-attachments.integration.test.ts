import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import type { PromptRequest } from '@agentclientprotocol/sdk';
import { agentAdapters } from '@repo/agents';
import {
  type BlobRef,
  blobPath,
  type ContentBlock,
  type SessionNewInput,
} from '@repo/contracts';
import { expect, it } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import { blobsFolderIn, uploadBlob } from '../blob';

const markdown = 'text/markdown';
const context: ContentBlock = {
  type: 'resource',
  resource: {
    uri: 'file:///project/context.md',
    mimeType: markdown,
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
        steps: [],
        initialize: {
          protocolVersion: 1,
          agentCapabilities: {
            _meta: { authStatus: {} },
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

const uploadFile = (
  host: Awaited<ReturnType<typeof startAcpEngine>>,
  file: File,
): Promise<BlobRef> =>
  uploadBlob(
    {
      databaseWriter: host.databaseWriter,
      blobsFolder: blobsFolderIn(host.home),
    },
    file,
  );
const uploadedLink = (
  blob: BlobRef,
  name: string,
): Extract<SessionNewInput['prompt'][number], { type: 'resource_link' }> => ({
  type: 'resource_link',
  name,
  uri: blobPath(blob.blobId),
  mimeType: blob.mime,
  size: blob.bytes,
  blob,
});
const fileUri = (host: { home: string }, blob: BlobRef, name: string): string =>
  pathToFileURL(join(host.home, 'attachments', blob.blobId, name)).href;
const promptWithUpload = async (
  embeddedContext: boolean,
  file: File,
): Promise<{
  request: PromptRequest;
  blob: BlobRef;
  host: Awaited<ReturnType<typeof startAcpEngine>>;
}> => {
  const received = Promise.withResolvers<PromptRequest>();
  const host = await startAcpEngine({
    steps: [],
    initialize: {
      protocolVersion: 1,
      agentCapabilities: {
        _meta: { authStatus: {} },
        promptCapabilities: { embeddedContext },
        sessionCapabilities: { close: {} },
      },
    },
    responses: { 'session/prompt': [{ received }] },
  });
  const blob = await uploadFile(host, file);
  await host.caller.session.new({
    ...emptySessionInput,
    prompt: [uploadedLink(blob, file.name)],
  });
  return { request: await received.promise, blob, host };
};
const notes = '# Notes\nEvery line reaches the Agent.\n';

it('an uploaded text file reaches the Agent inline, named by a copy that keeps its file name', async () => {
  const { request, blob, host } = await promptWithUpload(
    true,
    new File([notes], 'notes.md', { type: markdown }),
  );
  expect(request.prompt).toEqual([
    {
      type: 'resource',
      resource: {
        uri: fileUri(host, blob, 'notes.md'),
        mimeType: markdown,
        text: notes,
      },
    },
  ]);
});

it('an uploaded text file is linked when the Agent takes no embedded context', async () => {
  const { request, blob, host } = await promptWithUpload(
    false,
    new File([notes], 'notes.md', { type: markdown }),
  );
  expect(request.prompt).toEqual([
    {
      type: 'resource_link',
      name: 'notes.md',
      uri: fileUri(host, blob, 'notes.md'),
      mimeType: markdown,
      size: notes.length,
    },
  ]);
});

it('an uploaded binary file is linked to a copy holding its exact bytes', async () => {
  const bytes = new Uint8Array([37, 80, 68, 70, 0, 255, 1]);
  const { request, blob, host } = await promptWithUpload(
    true,
    new File([bytes], 'spec.pdf', { type: 'application/pdf' }),
  );
  expect({
    prompt: request.prompt,
    copy: new Uint8Array(
      await readFile(fileURLToPath(fileUri(host, blob, 'spec.pdf'))),
    ),
  }).toEqual({
    prompt: [
      {
        type: 'resource_link',
        name: 'spec.pdf',
        uri: fileUri(host, blob, 'spec.pdf'),
        mimeType: 'application/pdf',
        size: bytes.length,
      },
    ],
    copy: bytes,
  });
});

it('an uploaded file keeps its Blob for the Session that sent it', async () => {
  const { blob, host } = await promptWithUpload(
    true,
    new File([notes], 'notes.md', { type: markdown }),
  );
  expect(
    host.database.$client.prepare('SELECT blob_id FROM blob_ref').all(),
  ).toEqual([{ blob_id: blob.blobId }]);
});

it('an uploaded file name cannot leave its attachment folder', async () => {
  const { request, blob, host } = await promptWithUpload(
    false,
    new File([notes], '../../escape.md', { type: markdown }),
  );
  expect(request.prompt).toMatchObject([
    { uri: fileUri(host, blob, 'escape.md') },
  ]);
});
