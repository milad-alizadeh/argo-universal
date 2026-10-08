import { isToolCallRunning, type ToolCallUpdate } from '@repo/contracts';
import { View } from 'react-native';
import { Text } from '#primitives/text';
import { toolCallTitle } from '../feed/tool-call-title';
import { FeedCodeBlock } from './feed-code-block';
import { ToolCallDisclosure } from './tool-call-disclosure';
import { toolCallIcon } from './tool-call-icon';

export interface ToolCallRowProps {
  row: ToolCallUpdate;
  initialOpen?: boolean;
  permissionMessage?: string;
  awaitingApproval?: boolean;
}

export function ToolCallRow({
  row,
  initialOpen,
  permissionMessage,
  awaitingApproval = false,
}: ToolCallRowProps) {
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
    <ToolCallDisclosure
      label={toolCallTitle(row, awaitingApproval)}
      icon={toolCallIcon(row)}
      running={isToolCallRunning(row)}
      failed={row.status === 'failed'}
      initialOpen={initialOpen}
      awaitingApproval={awaitingApproval}
      permissionOutcome={row._meta?.argo?.permissionOutcome}
      permissionMessage={permissionMessage}
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
    </ToolCallDisclosure>
  );
}
