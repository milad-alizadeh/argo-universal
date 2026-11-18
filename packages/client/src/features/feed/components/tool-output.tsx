import type {
  ContentBlock,
  ToolCallContent,
  ToolCallDiff,
  ToolCallUpdate,
} from '@repo/contracts';
import { withOccurrenceKeys } from '@repo/kit/occurrence-keys';
import { ResourceCode as FeedCodeBlock } from '@repo/kit/primitives/content/code';
import type * as React from 'react';
import { View } from 'react-native';
import { unfencedText } from '../view/fenced-text';
import { toFileDiffs } from '../view/file-diff';
import type { KeyedImage } from '../view/keyed-image';
import { toolCallImageAt } from '../view/tool-call-images';
import { DiffView } from './diff-view/diff-view';
import { FeedContent } from './feed-content/feed-content';
import { FeedImage } from './feed-image';
import { UnsupportedFeedContent } from './feed-notice/feed-notice';

function ToolDiffOutput({ block }: { block: ToolCallDiff }): React.JSX.Element {
  return (
    <View className="gap-2">
      {withOccurrenceKeys(toFileDiffs(block), (file) => file.path).map(
        ({ item: file, key }) => (
          <DiffView key={key} file={file} inline />
        ),
      )}
    </View>
  );
}

interface BlockDrawing {
  fileName?: string;
  // The block's image as the Feed lists it, so it opens among the Feed's other images.
  image?: KeyedImage;
}

function ToolOutputBlock({
  block,
  ...drawing
}: BlockDrawing & { block: ToolCallContent }): React.JSX.Element {
  if (block.type === 'diff') return <ToolDiffOutput block={block} />;

  if (block.type === 'terminal')
    return <FeedCodeBlock code={block.output} title="Output" />;

  return <ToolContentOrPlaceholder block={block} {...drawing} />;
}

function ToolContentOrPlaceholder({
  block,
  ...drawing
}: BlockDrawing & {
  block: Exclude<ToolCallContent, { type: 'diff' | 'terminal' }>;
}): React.JSX.Element {
  return block.type === 'content' ? (
    <ToolContentBlock block={block.content} {...drawing} />
  ) : (
    <UnsupportedFeedContent block={block} />
  );
}

interface ToolTextProps {
  text: string;
  fileName?: string;
}

function ToolText({ text, fileName }: ToolTextProps): React.JSX.Element {
  // The file's name titles the block and, by its extension, decides the highlighting.
  return (
    <FeedCodeBlock
      code={unfencedText(text)}
      title={fileName ?? 'Output'}
      language={fileName}
    />
  );
}

function ToolContentBlock({
  block,
  fileName,
  image,
}: BlockDrawing & { block: ContentBlock }): React.JSX.Element {
  if (block.type === 'text')
    return <ToolText text={block.text} fileName={fileName} />;

  return image ? (
    <FeedImage image={image.image} imageKey={image.key} />
  ) : (
    <FeedContent content={[block]} />
  );
}

interface ToolOutputProps {
  content: readonly ToolCallContent[];
  fileName?: string;
  // The Tool call the blocks are from, when its row draws their images itself.
  row?: ToolCallUpdate;
}

const drawingOf = (
  { fileName, row }: ToolOutputProps,
  block: ToolCallContent,
): BlockDrawing => ({ fileName, image: row && toolCallImageAt(row, block) });

export function ToolOutput(props: ToolOutputProps): React.JSX.Element {
  return (
    <View className="gap-2">
      {withOccurrenceKeys(props.content, (block) => block.type).map(
        ({ item: block, key }) => (
          <ToolOutputBlock
            key={key}
            block={block}
            {...drawingOf(props, block)}
          />
        ),
      )}
    </View>
  );
}
