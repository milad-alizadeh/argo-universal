import type { ImageContent, ToolCallUpdate } from '@repo/contracts';
import { toolCallFacts } from './feed-row-facts';
import type { FeedActivity, FeedGroup } from './feed-view';
import { fileName } from './file-edit-label';

type ToolContent = ToolCallUpdate['content'];

const isImage = (
  block: ToolContent[number],
): block is Extract<ToolContent[number], { type: 'content' }> & {
  content: ImageContent;
} => block.type === 'content' && block.content.type === 'image';

// The images a Tool call returned, each named after the file it read.
export const toolCallImages = (row: ToolCallUpdate): ImageContent[] => {
  const path = toolCallFacts(row).path;

  return row.content
    .filter(isImage)
    .map((block) =>
      path ? { ...block.content, name: fileName(path) } : block.content,
    );
};

// A Tool call's output without the images it draws as thumbnails.
export const withoutImages = (content: ToolContent): ToolContent =>
  content.filter((block) => !isImage(block));

const activityCalls = (activity: FeedActivity): ToolCallUpdate[] => {
  if (activity.type === 'tool_call') return [activity.row];

  return activity.type === 'exploration' ? activity.toolCalls : [];
};

// Every image a group's Tool calls returned, in the order they ran.
export const groupImages = (group: FeedGroup): ImageContent[] =>
  group.items.flatMap(activityCalls).flatMap(toolCallImages);
