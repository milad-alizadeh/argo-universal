import type { ImageContent, ToolCallUpdate } from '@repo/contracts';
import { toolCallFacts } from './feed-row-facts';
import type { FeedActivity, FeedGroup } from './feed-view';
import { fileName } from './file-edit-label';
import { imageKeyAt, type KeyedImage } from './keyed-image';

type ToolContent = ToolCallUpdate['content'];

const isImage = (
  block: ToolContent[number],
): block is Extract<ToolContent[number], { type: 'content' }> & {
  content: ImageContent;
} => block.type === 'content' && block.content.type === 'image';

// The images a Tool call returned, each named after the file it read.
export const toolCallImages = (row: ToolCallUpdate): KeyedImage[] => {
  const path = toolCallFacts(row).path;
  const name = path ? { name: fileName(path) } : undefined;

  return row.content.flatMap((block, index) =>
    isImage(block)
      ? [
          {
            key: imageKeyAt(row.id, index),
            image: { ...block.content, ...name },
          },
        ]
      : [],
  );
};

// The image one of a Tool call's own content blocks holds, as the Feed lists it, or none for any other block.
export const toolCallImageAt = (
  row: ToolCallUpdate,
  block: ToolContent[number],
): KeyedImage | undefined => {
  const key = imageKeyAt(row.id, row.content.indexOf(block));

  return toolCallImages(row).find((image) => image.key === key);
};

// A Tool call's output without the images it draws as thumbnails.
export const withoutImages = (content: ToolContent): ToolContent =>
  content.filter((block) => !isImage(block));

const activityCalls = (activity: FeedActivity): ToolCallUpdate[] => {
  if (activity.type === 'tool_call') return [activity.row];

  return activity.type === 'exploration' ? activity.toolCalls : [];
};

// The images an activity's Tool calls returned, in the order they ran.
export const activityImages = (activity: FeedActivity): KeyedImage[] =>
  activityCalls(activity).flatMap(toolCallImages);

// Every image a group's Tool calls returned, in the order they ran.
export const groupImages = (group: FeedGroup): KeyedImage[] =>
  group.items.flatMap(activityImages);
