import { isToolCallRunning, type ToolCallUpdate } from '@repo/contracts';
import type * as React from 'react';
import { View } from 'react-native';
import { Text } from '#lib/generic/primitives/display/text/text';
import {
  ToolCallDisclosure,
  toolCallDisclosureProps,
} from '../tool-call-disclosure';
import { toolCallIcon } from '../tool-call-icon';
import { toolCallPath } from '../tool-call-meta';
import { ToolOutput } from '../tool-output';

export interface ToolCallRowProps {
  row: ToolCallUpdate;
  initialOpen?: boolean;
  permissionMessage?: string;
  awaitingApproval?: boolean;
}

const settledLabels = new Map<ToolCallUpdate['status'], string>([
  ['failed', 'Failed'],
  ['cancelled', 'Stopped'],
]);

function SettledStatus({
  status,
}: {
  status: ToolCallUpdate['status'];
}): React.JSX.Element | null {
  const label = settledLabels.get(status);
  return label ? (
    <View className="px-3 pb-2">
      <Text className="text-muted-foreground">{label}</Text>
    </View>
  ) : null;
}

function ToolCallRowOutput({
  row,
}: {
  row: ToolCallUpdate;
}): React.JSX.Element {
  return (
    <>
      <ToolOutput
        content={row.content}
        language={toolCallPath(row)?.split('/').at(-1)}
      />
      <SettledStatus status={row.status} />
    </>
  );
}

export function ToolCallRow(props: ToolCallRowProps): React.JSX.Element {
  const { row } = props;
  return (
    <ToolCallDisclosure
      {...toolCallDisclosureProps(row, props.awaitingApproval)}
      icon={toolCallIcon(row)}
      running={isToolCallRunning(row)}
      failed={row.status === 'failed'}
      initialOpen={props.initialOpen}
      permissionMessage={props.permissionMessage}
    >
      <ToolCallRowOutput row={row} />
    </ToolCallDisclosure>
  );
}
