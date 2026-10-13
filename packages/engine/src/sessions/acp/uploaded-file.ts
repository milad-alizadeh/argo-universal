import { pathToFileURL } from 'node:url';
import type {
  ContentBlock as AcpContentBlock,
  PromptCapabilities,
} from '@agentclientprotocol/sdk';
import type { ContentBlock } from '@repo/contracts';
import {
  type AttachedFile,
  type AttachmentStorage,
  attachFile,
} from '../../blob';

type ResourceLink = Extract<ContentBlock, { type: 'resource_link' }>;
export type UploadedFile = ResourceLink & Required<Pick<ResourceLink, 'blob'>>;
// Text files over 100 KiB are linked, so one attachment cannot fill the Agent's context.
const inlineTextLimitBytes = 102_400;
const utf8 = new TextDecoder('utf-8', { fatal: true });
export const promptMetadata = (
  metadata: ContentBlock['_meta'],
): AcpContentBlock['_meta'] => metadata?.acp;
const inlinable = (bytes: Buffer): boolean =>
  bytes.length <= inlineTextLimitBytes && !bytes.includes(0);
const decodeUtf8 = (bytes: Buffer): string | undefined => {
  try {
    return utf8.decode(bytes);
  } catch {
    return undefined;
  }
};
// The file's text when the Agent takes embedded context and the file is short UTF-8 text.
const inlineText = (
  attached: AttachedFile,
  capabilities: PromptCapabilities,
): string | undefined =>
  capabilities.embeddedContext && inlinable(attached.bytes)
    ? decodeUtf8(attached.bytes)
    : undefined;
const embeddedFile = (
  upload: UploadedFile,
  uri: string,
  text: string,
): AcpContentBlock => ({
  type: 'resource',
  resource: { uri, mimeType: upload.blob.mime, text },
  _meta: promptMetadata(upload._meta),
});
const linkedFile = (upload: UploadedFile, uri: string): AcpContentBlock => {
  const { blob, ...link } = upload;
  return {
    ...link,
    uri,
    mimeType: blob.mime,
    size: blob.bytes,
    _meta: promptMetadata(upload._meta),
  };
};
const uploadedFilePrompt = (
  upload: UploadedFile,
  attached: AttachedFile,
  capabilities: PromptCapabilities,
): AcpContentBlock => {
  const uri = pathToFileURL(attached.path).href;
  const text = inlineText(attached, capabilities);
  return text === undefined
    ? linkedFile(upload, uri)
    : embeddedFile(upload, uri, text);
};
export const readUploadedFile = async (
  input: { capabilities: PromptCapabilities; storage: AttachmentStorage },
  upload: UploadedFile,
): Promise<AcpContentBlock> =>
  uploadedFilePrompt(
    upload,
    await attachFile(input.storage, upload.blob, upload.name),
    input.capabilities,
  );
