import type {
  ContentBlock as AcpContentBlock,
  PromptCapabilities,
} from '@agentclientprotocol/sdk';
import type { ContentBlock } from '@repo/contracts';
import { readBlobBytes, type BlobStorage } from '../../blob';

type PromptContentInput = {
  content: ContentBlock[];
  capabilities: PromptCapabilities;
  storage: BlobStorage;
};
const promptMetadata = (
  metadata: ContentBlock['_meta'],
): AcpContentBlock['_meta'] => metadata?.acp;
const readPromptImage = async (
  storage: BlobStorage,
  image: Extract<ContentBlock, { type: 'image' }>,
): Promise<AcpContentBlock> => {
  if (image.mimeType !== image.blob.mime)
    throw new Error('The attached image MIME type does not match its Blob');
  return {
    type: 'image',
    mimeType: image.mimeType,
    data: (await readBlobBytes(storage, image.blob)).toString('base64'),
    _meta: promptMetadata(image._meta),
  };
};
const readSupportedImage = (
  input: Omit<PromptContentInput, 'content'>,
  image: Extract<ContentBlock, { type: 'image' }>,
): Promise<AcpContentBlock> => {
  if (!input.capabilities.image)
    return Promise.reject(
      new Error('This Agent does not support image prompts'),
    );
  return readPromptImage(input.storage, image);
};
const contextPrompt = (
  context: Extract<ContentBlock, { type: 'resource' }>,
  text: string,
): AcpContentBlock => ({
  ...context,
  _meta: promptMetadata(context._meta),
  resource: {
    ...context.resource,
    text,
    _meta: promptMetadata(context.resource._meta),
  },
});
const readSupportedContext = (
  capabilities: PromptCapabilities,
  context: Extract<ContentBlock, { type: 'resource' }>,
): Promise<AcpContentBlock> => {
  if (!capabilities.embeddedContext || context.resource.text === undefined)
    return Promise.reject(
      new Error('This Agent does not support this embedded context'),
    );
  return Promise.resolve(contextPrompt(context, context.resource.text));
};
const readTextOrReferencePrompt = (
  block: Exclude<ContentBlock, { type: 'image' | 'resource' }>,
): Promise<AcpContentBlock> => {
  if (block.type === 'unsupported')
    return Promise.reject(
      new Error('Unsupported output placeholders cannot be sent as prompts'),
    );
  return Promise.resolve({ ...block, _meta: promptMetadata(block._meta) });
};
const convertPromptBlock = (
  input: Omit<PromptContentInput, 'content'>,
  block: ContentBlock,
): Promise<AcpContentBlock> => {
  switch (block.type) {
    case 'image':
      return readSupportedImage(input, block);
    case 'resource':
      return readSupportedContext(input.capabilities, block);
    default:
      return readTextOrReferencePrompt(block);
  }
};
export const readAcpPromptContent = (
  input: PromptContentInput,
): Promise<AcpContentBlock[]> =>
  Promise.all(input.content.map((block) => convertPromptBlock(input, block)));
