import { isToolCallRunning, type ToolCallUpdate } from '@repo/contracts';
import { ResourceCode } from '@repo/kit/primitives/content/code';
import { Text } from '@repo/kit/primitives/content/text';
import type * as React from 'react';
import { use } from 'react';
import { View } from 'react-native';
import { toolCallFacts } from '../../view/feed-row-facts';
import { fileName } from '../../view/file-edit-label';
import {
  ToolCallDisclosure,
  toolCallDisclosureProps,
} from '../tool-call-disclosure';
import { GroupLiveId } from '../tool-call-group/group-live-id';
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

// A string stays as the Agent sent it; any other value is shown as JSON.
const rawText = (
  row: ToolCallUpdate,
  field: 'rawInput' | 'rawOutput',
): string | undefined => {
  const value = row[field];

  if (value == null) return undefined;

  return typeof value === 'string' ? value : JSON.stringify(value, null, 2);
};

// A command the Agent has not yet sent output for names its command line only in its raw input.
function commandLine(row: ToolCallUpdate): string | undefined {
  if (!toolCallFacts(row).isCommand) return undefined;

  const input: unknown = row.rawInput;

  if (typeof input !== 'object' || input === null || !('command' in input))
    return undefined;

  return typeof input.command === 'string' ? input.command : undefined;
}

function RawInput({ row }: { row: ToolCallUpdate }): React.JSX.Element | null {
  const command = commandLine(row);

  if (command !== undefined)
    return <ResourceCode code={`$ ${command}`} title="Shell" />;

  const input = rawText(row, 'rawInput');

  return input === undefined ? null : (
    <ResourceCode code={input} title="Input" language="json" />
  );
}

// An MCP or Operation call reports its input and result only raw, with no content blocks; so does a command before its output.
function RawToolOutput({ row }: { row: ToolCallUpdate }): React.JSX.Element {
  const output = rawText(row, 'rawOutput');

  return (
    <View className="gap-2">
      <RawInput row={row} />
      {output !== undefined && (
        <ResourceCode code={output} title="Output" language="json" />
      )}
    </View>
  );
}

function ToolCallBody({ row }: { row: ToolCallUpdate }): React.JSX.Element {
  return row.content.length > 0 ? (
    <ToolOutput content={row.content} fileName={toolCallPath(row)} />
  ) : (
    <RawToolOutput row={row} />
  );
}

function ToolCallRowOutput({
  row,
}: {
  row: ToolCallUpdate;
}): React.JSX.Element {
  return (
    <>
      <ToolCallBody row={row} />
      <SettledStatus status={row.status} />
    </>
  );
}

function ToolCallRowDisclosure(props: ToolCallRowProps): React.JSX.Element {
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

export function ToolCallRow(props: ToolCallRowProps): React.JSX.Element {
  const titleInGroup = use(GroupLiveId) === props.row.id;

  return titleInGroup ? (
    <ToolCallRowOutput row={props.row} />
  ) : (
    <ToolCallRowDisclosure {...props} />
  );
}
