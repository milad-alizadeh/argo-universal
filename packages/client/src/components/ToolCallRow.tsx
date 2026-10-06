import type { ToolCallUpdate } from '@repo/contracts';
import { View } from 'react-native';
import { Text } from '#primitives/text';
import { toolCallTitle } from '../feed/tool-call-title';
import { FeedCodeBlock } from './FeedCodeBlock';
import { FeedDisclosure } from './FeedDisclosure';
import { PermissionOutcome } from './PermissionOutcome';
import { toolCallIcon } from './tool-call-icon';

export interface ToolCallRowProps {
  row: ToolCallUpdate;
  initialOpen?: boolean;
  permissionMessage?: string;
}

export function ToolCallRow({
  row,
  initialOpen,
  permissionMessage,
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
    <View className="gap-1">
      <FeedDisclosure
        label={toolCallTitle(row)}
        icon={toolCallIcon(row)}
        running={row.status === 'pending' || row.status === 'in_progress'}
        failed={row.status === 'failed'}
        initialOpen={initialOpen}
        awaitingApproval={row.title === 'Awaiting approval'}
        denied={
          row._meta?.argo?.permissionOutcome?.outcome === 'selected' &&
          row._meta.argo.permissionOutcome.optionId === 'reject_once'
        }
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
      {row._meta?.argo?.permissionOutcome && (
        <PermissionOutcome
          outcome={row._meta.argo.permissionOutcome}
          message={permissionMessage}
        />
      )}
    </View>
  );
}
