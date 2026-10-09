import type { ToolCallContent as AcpToolCallContent } from '@agentclientprotocol/sdk';
import type { ToolCallContent, ToolCallDiff } from '@repo/contracts';
import {
  createAcpContentMetadata,
  mapSupportedContentBlock,
  createUnsupportedContent,
  collectUnsupportedContentReasons,
} from './content';

const mapToolDiff = (
  block: Extract<AcpToolCallContent, { type: 'diff' }>,
): ToolCallDiff => ({
  type: 'diff',
  changes: [
    {
      operation: block.oldText == null ? 'add' : 'modify',
      path: block.path,
      oldText: block.oldText ?? undefined,
      newText: block.newText,
    },
  ],
  _meta: createAcpContentMetadata(block._meta),
});
const createUnavailableTerminalContent = (
  block: Extract<AcpToolCallContent, { type: 'terminal' }>,
): ToolCallContent => ({
  ...createUnsupportedContent(
    'terminal',
    'Terminal output is unavailable without a Client terminal resource',
  ),
  _meta: createAcpContentMetadata(block._meta),
});
export const mapToolCallContent = (
  block: AcpToolCallContent,
): ToolCallContent => {
  if (block.type === 'diff') return mapToolDiff(block);
  if (block.type === 'terminal') return createUnavailableTerminalContent(block);
  return {
    type: 'content',
    content: mapSupportedContentBlock(block.content),
    _meta: createAcpContentMetadata(block._meta),
  };
};
const collectUnsupportedToolBlockReasons = (
  block: ToolCallContent,
): string[] => {
  if (block.type === 'unsupported') return [block.reason];
  if (block.type !== 'content') return [];
  return collectUnsupportedContentReasons([block.content]);
};
export const collectUnsupportedToolContentReasons = (
  content: ToolCallContent[],
): string[] => content.flatMap(collectUnsupportedToolBlockReasons);
