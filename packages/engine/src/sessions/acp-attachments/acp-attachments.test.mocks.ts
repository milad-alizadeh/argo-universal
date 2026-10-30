import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { PromptRequest } from '@agentclientprotocol/sdk';
import {
  type BlobRef,
  blobPath,
  type ContentBlock,
  type UploadedFileLink,
} from '@repo/contracts';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import { blobsFolderIn, uploadBlob } from '../../blob';

export const markdown = 'text/markdown';

export const pdf = 'application/pdf';

export const context: ContentBlock = {
  type: 'resource',
  resource: {
    uri: 'file:///project/context.md',
    mimeType: markdown,
    text: '# Context\nAll supported context.\n',
  },
  _meta: { acp: { attachment: 'context' } },
};

export const reference: ContentBlock = {
  type: 'resource_link',
  uri: 'file:///project/source.ts',
  name: 'source.ts',
  mimeType: 'text/typescript',
  title: 'Source',
  description: 'Full reference',
  size: 200,
  _meta: { acp: { attachment: 'reference' } },
};

export const uploadFile = (
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

export const uploadedLink = (
  blob: BlobRef,
  name: string,
): UploadedFileLink => ({
  type: 'resource_link',
  name,
  uri: blobPath(blob.blobId),
  mimeType: blob.mime,
  size: blob.bytes,
  blob,
});

export const fileUri = (
  host: { home: string },
  blob: BlobRef,
  name: string,
): string =>
  pathToFileURL(join(host.home, 'attachments', blob.blobId, name)).href;

export const promptWithUpload = async (
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

export const notes = '# Notes\nEvery line reaches the Agent.\n';
