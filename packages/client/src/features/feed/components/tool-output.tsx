import type {
  ContentBlock,
  ToolCallContent,
  ToolCallDiff,
} from '@repo/contracts';
import { withOccurrenceKeys } from '@repo/kit/occurrence-keys';
import { ResourceCode as FeedCodeBlock } from '@repo/kit/primitives/content/code';
import type * as React from 'react';
import { View } from 'react-native';
import { unfencedText } from '../view/fenced-text';
import { toFileDiffs } from '../view/file-diff';
import { DiffView } from './diff-view/diff-view';
import { FeedContent } from './feed-content/feed-content';
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

function ToolOutputBlock({
  block,
  fileName,
}: {
  block: ToolCallContent;
  fileName?: string;
}): React.JSX.Element {
  if (block.type === 'diff') return <ToolDiffOutput block={block} />;

  if (block.type === 'terminal')
    return <FeedCodeBlock code={block.output} title="Output" />;

  return <ToolContentOrPlaceholder block={block} fileName={fileName} />;
}

function ToolContentOrPlaceholder({
  block,
  fileName,
}: {
  block: Exclude<ToolCallContent, { type: 'diff' | 'terminal' }>;
  fileName?: string;
}): React.JSX.Element {
  return block.type === 'content' ? (
    <ToolContentBlock block={block.content} fileName={fileName} />
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

function ToolContentBlock(props: {
  block: ContentBlock;
  fileName?: string;
}): React.JSX.Element {
  const { block, fileName } = props;

  return block.type === 'text' ? (
    <ToolText text={block.text} fileName={fileName} />
  ) : (
    <FeedContent content={[block]} />
  );
}

interface ToolOutputProps {
  content: readonly ToolCallContent[];
  fileName?: string;
}

export function ToolOutput({
  content,
  fileName,
}: ToolOutputProps): React.JSX.Element {
  return (
    <View className="gap-2">
      {withOccurrenceKeys(content, (block) => block.type).map(
        ({ item: block, key }) => (
          <ToolOutputBlock key={key} block={block} fileName={fileName} />
        ),
      )}
    </View>
  );
}
