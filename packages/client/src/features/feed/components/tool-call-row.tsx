import { isToolCallRunning, type ToolCallUpdate } from '@repo/contracts';
import type * as React from 'react';
import { View } from 'react-native';
import { Text } from '#lib/generic/primitives/text';
import { toolCallTitle, toolCallTitlePaths } from '../view/tool-call-title';
import { ToolCallDisclosure } from './tool-call-disclosure';
import { toolCallIcon } from './tool-call-icon';
import { ToolOutput } from './tool-output';

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
}: ToolCallRowProps): React.JSX.Element {
  const path =
    row._meta?.argo?.commandActions?.find((action) => action.path)?.path ??
    row.locations?.[0]?.path;
  return (
    <ToolCallDisclosure
      label={toolCallTitle(row, awaitingApproval)}
      paths={toolCallTitlePaths(row, awaitingApproval)}
      icon={toolCallIcon(row)}
      running={isToolCallRunning(row)}
      failed={row.status === 'failed'}
      initialOpen={initialOpen}
      awaitingApproval={awaitingApproval}
      permissionOutcome={row._meta?.argo?.permissionOutcome}
      permissionMessage={permissionMessage}
    >
      <ToolOutput content={row.content} language={path?.split('/').at(-1)} />
      {(row.status === 'failed' || row.status === 'cancelled') && (
        <View className="px-3 pb-2">
          <Text className="type-secondary">
            {row.status === 'failed' ? 'Failed' : 'Stopped'}
          </Text>
        </View>
      )}
    </ToolCallDisclosure>
  );
}
