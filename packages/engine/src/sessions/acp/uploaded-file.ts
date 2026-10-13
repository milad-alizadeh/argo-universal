import { pathToFileURL } from 'node:url';
import type {
  ContentBlock as AcpContentBlock,
  PromptCapabilities,
} from '@agentclientprotocol/sdk';
import {
  blobPath,
  inlineTextLimitBytes,
  isPlainText,
  type UploadedFileLink,
} from '@repo/contracts';
import {
  type AttachedFile,
  type AttachmentStorage,
  attachFile,
} from '../../blob';
import { promptMetadata } from './prompt-metadata';

const plainText = (bytes: Buffer): string | undefined => {
  const decoded = bytes.toString('utf8');
  return isPlainText(decoded) ? decoded : undefined;
};
// The file's text when the Agent takes embedded context and the file is short plain text.
const inlineText = (
  attached: AttachedFile,
  capabilities: PromptCapabilities,
): string | undefined =>
  capabilities.embeddedContext && attached.bytes.length <= inlineTextLimitBytes
    ? plainText(attached.bytes)
    : undefined;
const embeddedFile = (
  upload: UploadedFileLink,
  uri: string,
  text: string,
): AcpContentBlock => ({
  type: 'resource',
  resource: { uri, mimeType: upload.blob.mime, text },
  _meta: promptMetadata(upload._meta),
});
const linkedFile = (upload: UploadedFileLink, uri: string): AcpContentBlock => {
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
  upload: UploadedFileLink,
  attached: AttachedFile,
  capabilities: PromptCapabilities,
): AcpContentBlock => {
  const uri = pathToFileURL(attached.path).href;
  const text = inlineText(attached, capabilities);
  return text === undefined
    ? linkedFile(upload, uri)
    : embeddedFile(upload, uri, text);
};
const sameOrAbsent = <Value>(
  value: Value | undefined,
  stored: Value,
): boolean => value === undefined || value === stored;
// A link's own fields describe its Blob, as an image's MIME type must.
const describesItsBlob = ({
  uri,
  mimeType,
  size,
  blob,
}: UploadedFileLink): boolean =>
  uri === blobPath(blob.blobId) &&
  sameOrAbsent(mimeType, blob.mime) &&
  sameOrAbsent(size, blob.bytes);
export const readUploadedFile = async (
  input: { capabilities: PromptCapabilities; storage: AttachmentStorage },
  upload: UploadedFileLink,
): Promise<AcpContentBlock> => {
  if (!describesItsBlob(upload))
    throw new Error('The attached file does not match its Blob');
  return uploadedFilePrompt(
    upload,
    await attachFile(input.storage, upload.blob, upload.name),
    input.capabilities,
  );
};
