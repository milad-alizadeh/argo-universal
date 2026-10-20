import type {
  ContentBlock,
  ToolCallContent,
  ToolCallDiff,
} from '@repo/contracts';
import type * as React from 'react';
import { View } from 'react-native';
import { withOccurrenceKeys } from '#lib/generic/occurrence-keys';
import { FeedCodeBlock } from '#lib/product/markdown/feed-code-block/feed-code-block';
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

function ToolContentBlock({
  block,
  fileName,
}: {
  block: ContentBlock;
  fileName?: string;
}): React.JSX.Element {
  if (block.type === 'text')
    return (
      <FeedCodeBlock
        code={block.text}
        title={fileName ?? 'Output'}
        language={fileName}
      />
    );

  return <FeedContent content={[block]} />;
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
