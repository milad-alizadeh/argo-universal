import type {
  ContentBlock,
  ToolCallContent,
  ToolCallDiff,
} from '@repo/contracts';
import type * as React from 'react';
import { View } from 'react-native';
import { withOccurrenceKeys } from '#lib/occurrence-keys';
import { toFileDiffs } from '../feed/file-diff';
import { DiffView } from './diff-view';
import { FeedCodeBlock } from './feed-code-block';
import { FeedContent } from './feed-content';
import { UnsupportedFeedContent } from './feed-notice';

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
  language,
}: {
  block: ToolCallContent;
  language?: string;
}): React.JSX.Element {
  if (block.type === 'diff') return <ToolDiffOutput block={block} />;
  if (block.type === 'terminal')
    return <FeedCodeBlock code={block.output} language="Output" />;
  return <ToolContentOrPlaceholder block={block} language={language} />;
}
function ToolContentOrPlaceholder({
  block,
  language,
}: {
  block: Exclude<ToolCallContent, { type: 'diff' | 'terminal' }>;
  language?: string;
}): React.JSX.Element {
  return block.type === 'content' ? (
    <ToolContentBlock block={block.content} language={language} />
  ) : (
    <UnsupportedFeedContent block={block} />
  );
}
function ToolContentBlock({
  block,
  language,
}: {
  block: ContentBlock;
  language?: string;
}): React.JSX.Element {
  if (block.type === 'text')
    return <FeedCodeBlock code={block.text} language={language ?? 'Output'} />;
  return <FeedContent content={[block]} />;
}
export function ToolOutput({
  content,
  language,
}: {
  content: readonly ToolCallContent[];
  language?: string;
}): React.JSX.Element {
  return (
    <View className="gap-2">
      {withOccurrenceKeys(content, (block) => block.type).map(
        ({ item: block, key }) => (
          <ToolOutputBlock key={key} block={block} language={language} />
        ),
      )}
    </View>
  );
}
