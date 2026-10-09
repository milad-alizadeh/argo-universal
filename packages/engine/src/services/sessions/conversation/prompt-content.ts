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
    ...(image._meta ? { _meta: image._meta } : {}),
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
const readSupportedContext = (
  capabilities: PromptCapabilities,
  context: Extract<ContentBlock, { type: 'resource' }>,
): Promise<AcpContentBlock> => {
  if (!capabilities.embeddedContext || context.resource.text === undefined)
    return Promise.reject(
      new Error('This Agent does not support this embedded context'),
    );
  return Promise.resolve({
    ...context,
    resource: { ...context.resource, text: context.resource.text },
  });
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
      return Promise.resolve(block);
  }
};
export const readAcpPromptContent = (
  input: PromptContentInput,
): Promise<AcpContentBlock[]> =>
  Promise.all(input.content.map((block) => convertPromptBlock(input, block)));
