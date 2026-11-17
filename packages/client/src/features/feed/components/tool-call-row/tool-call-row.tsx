import { isToolCallRunning, type ToolCallUpdate } from '@repo/contracts';
import {
  type CodeSection,
  CodeSections,
} from '@repo/kit/primitives/content/code';
import { Text } from '@repo/kit/primitives/content/text';
import type * as React from 'react';
import { use } from 'react';
import { View } from 'react-native';
import { toolCallFacts } from '../../view/feed-row-facts';
import { fileName } from '../../view/file-edit-label';
import { toolCallImages, withoutImages } from '../../view/tool-call-images';
import { imageStackAside } from '../feed-image-stack';
import { shellRuns } from '../shell-runs';
import {
  ToolCallDisclosure,
  toolCallDisclosureProps,
} from '../tool-call-disclosure';
import { GroupChild } from '../tool-call-group/group-child';
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

// The command line coloured as bash, as a Shell block draws it.
const shellSection = (command: string): CodeSection => ({
  title: 'Shell',
  code: `$ ${command}`,
  runs: shellRuns(command),
});

// A command shows its command line, not its raw input.
function rawInputSection(row: ToolCallUpdate): CodeSection | undefined {
  const command = toolCallFacts(row).command;

  if (command !== undefined) return shellSection(command);

  const input = rawText(row, 'rawInput');

  return input === undefined
    ? undefined
    : { title: 'Input', code: input, language: 'json' };
}

function rawOutputSection(row: ToolCallUpdate): CodeSection | undefined {
  const output = rawText(row, 'rawOutput');

  return output === undefined
    ? undefined
    : { title: 'Output', code: output, language: 'json' };
}

// An MCP or Operation call reports its input and result only raw, with no content blocks; so does a command before its output.
function RawToolOutput({
  row,
}: {
  row: ToolCallUpdate;
}): React.JSX.Element | null {
  const sections = [rawInputSection(row), rawOutputSection(row)].filter(
    (section): section is CodeSection => section !== undefined,
  );

  return sections.length > 0 ? <CodeSections sections={sections} /> : null;
}

// A call that returned images draws them as thumbnails on its header; its raw output only repeats their bytes.
function ToolCallBody({
  row,
}: {
  row: ToolCallUpdate;
}): React.JSX.Element | null {
  const content = withoutImages(row.content);

  if (content.length > 0)
    return <ToolOutput content={content} fileName={toolCallPath(row)} />;

  return content.length === row.content.length ? (
    <RawToolOutput row={row} />
  ) : null;
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

function rowDisclosureProps(
  { row, awaitingApproval, initialOpen }: ToolCallRowProps,
  groupChild: boolean,
): Omit<React.ComponentProps<typeof ToolCallDisclosure>, 'children'> {
  return {
    ...toolCallDisclosureProps(row, awaitingApproval, groupChild),
    icon: toolCallIcon(row),
    running: isToolCallRunning(row),
    failed: row.status === 'failed',
    initialOpen,
    aside: imageStackAside(toolCallImages(row), 'row'),
  };
}

function ToolCallRowDisclosure(props: ToolCallRowProps): React.JSX.Element {
  return (
    <ToolCallDisclosure {...rowDisclosureProps(props, use(GroupChild))}>
      <ToolCallRowOutput row={props.row} />
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
