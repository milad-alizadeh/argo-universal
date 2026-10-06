import type { ToolCallUpdate } from '@repo/contracts';
import { BookOpenIcon } from 'phosphor-react-native/src/icons/BookOpen';
import { View } from 'react-native';
import { Text } from '#primitives/text';
import { toolCallTitle } from '../feed/tool-call-title';
import { FeedCodeBlock } from './FeedCodeBlock';
import { FeedDisclosure } from './FeedDisclosure';

export interface ToolCallRowProps {
  row: ToolCallUpdate;
  initialOpen?: boolean;
}

export function ToolCallRow({ row, initialOpen }: ToolCallRowProps) {
  const path =
    row._meta?.argo?.commandActions?.find((action) => action.path)?.path ??
    row.locations?.[0]?.path;
  const output = row.content
    .flatMap((block) => {
      if (block.type === 'terminal') return [block.output];
      if (block.type !== 'content') return [];
      if (block.content.type === 'text') return [block.content.text];
      if (
        block.content.type === 'resource' &&
        block.content.resource.text !== undefined
      )
        return [block.content.resource.text];
      return [];
    })
    .join('\n');
  return (
    <FeedDisclosure
      label={toolCallTitle(row)}
      icon={BookOpenIcon}
      running={row.status === 'pending' || row.status === 'in_progress'}
      failed={row.status === 'failed'}
      initialOpen={initialOpen}
    >
      <FeedCodeBlock
        language={path?.split('/').at(-1) ?? 'Output'}
        code={output}
        footer={
          row.status === 'failed' || row.status === 'cancelled' ? (
            <View className="px-3 pb-2">
              <Text className="text-sm text-muted-foreground">
                {row.status === 'failed' ? 'Failed' : 'Stopped'}
              </Text>
            </View>
          ) : undefined
        }
      />
    </FeedDisclosure>
  );
}
