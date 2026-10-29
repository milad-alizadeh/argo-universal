import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import type { PromptRequest } from '@agentclientprotocol/sdk';
import {
  type BlobRef,
  blobPath,
  type ContentBlock,
  type UploadedFileLink,
} from '@repo/contracts';
import { fixtureAgents } from '@repo/mocks/agent/app-fixtures';
import { expect, it } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import { blobsFolderIn, uploadBlob } from '../blob';

const markdown = 'text/markdown';

const pdf = 'application/pdf';

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

it('a New Session sends a chosen suggestion link, with no uploaded file, to the Agent beside its text', async () => {
  const received = Promise.withResolvers<PromptRequest>();

  const host = await startAcpEngine({
    steps: [],
    responses: { 'session/prompt': [{ received }] },
  });

  await host.caller.session.new({
    ...emptySessionInput,
    prompt: [
      { type: 'text', text: 'See ITEM-7 ' },
      { type: 'resource_link', name: 'ITEM-7', uri: 'example://items/7' },
    ],
  });
  expect((await received.promise).prompt).toEqual([
    { type: 'text', text: 'See ITEM-7 ' },
    { type: 'resource_link', name: 'ITEM-7', uri: 'example://items/7' },
  ]);
});

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

const uploadedLink = (blob: BlobRef, name: string): UploadedFileLink => ({
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
    new File([bytes], 'spec.pdf', { type: pdf }),
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
        mimeType: pdf,
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

it.each([
  {
    kind: 'longer than 100 KiB',
    file: new File(['a'.repeat(102_401)], 'long.md', { type: markdown }),
  },
  {
    kind: 'not UTF-8',
    file: new File([new Uint8Array([99, 97, 102, 233])], 'latin.txt', {
      type: 'text/plain',
    }),
  },
])('an uploaded text file $kind is linked, not inlined', async ({ file }) => {
  const { request, blob, host } = await promptWithUpload(true, file);
  expect(request.prompt).toEqual([
    {
      type: 'resource_link',
      name: file.name,
      uri: fileUri(host, blob, file.name),
      mimeType: file.type,
      size: file.size,
    },
  ]);
});

it.each([
  { field: 'uri', change: { uri: blobPath('b'.repeat(64)) } },
  { field: 'mimeType', change: { mimeType: pdf } },
  { field: 'size', change: { size: 1 } },
])(
  'an uploaded file whose $field does not match its Blob is refused before the Agent sees it',
  async ({ change }) => {
    const requests: PromptRequest[] = [];

    const host = await startAcpEngine({
      steps: [],
      responses: { 'session/prompt': [{ requests }] },
    });

    const blob = await uploadFile(
      host,
      new File([notes], 'notes.md', { type: markdown }),
    );

    const created = await host.caller.session.new(emptySessionInput);
    await expect(
      host.caller.session.prompt({
        ...created,
        prompt: [{ ...uploadedLink(blob, 'notes.md'), ...change }],
      }),
    ).rejects.toThrow('does not match its Blob');
    expect(requests).toEqual([]);
  },
);
