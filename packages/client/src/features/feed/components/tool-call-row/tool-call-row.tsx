import { isToolCallRunning, type ToolCallUpdate } from '@repo/contracts';
import { Text } from '@repo/kit/primitives/content/text';
import type * as React from 'react';
import { View } from 'react-native';
import { toolCallFacts } from '../../view/feed-row-facts';
import { fileName } from '../../view/file-edit-label';
import {
  ToolCallDisclosure,
  toolCallDisclosureProps,
} from '../tool-call-disclosure';
import { toolCallIcon } from '../tool-call-icon';
import { ToolOutput } from '../tool-output';

export interface ToolCallRowProps {
  row: ToolCallUpdate;
  initialOpen?: boolean;
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

const toolCallPath = (row: ToolCallUpdate): string | undefined => {
  const path = toolCallFacts(row).path;

  return path ? fileName(path) : undefined;
};

function ToolCallRowOutput({
  row,
}: {
  row: ToolCallUpdate;
}): React.JSX.Element {
  return (
    <>
      <ToolOutput content={row.content} fileName={toolCallPath(row)} />
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
    >
      <ToolCallRowOutput row={row} />
    </ToolCallDisclosure>
  );
}
