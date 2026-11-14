import type {
  PermissionOutcome as Outcome,
  ToolCallUpdate,
} from '@repo/contracts';
import type * as React from 'react';
import { View } from 'react-native';
import { toolCallFacts } from '../view/feed-row-facts';
import { toolCallTitle, toolCallTitlePaths } from '../view/tool-call-title';
import { FeedDisclosure, type FeedDisclosureProps } from './feed-disclosure';
import { chosenPermissionKind, PermissionOutcome } from './permission-outcome';

type ToolCallDisclosureProps = Omit<FeedDisclosureProps, 'denied'> & {
  permissionOutcome?: Outcome;
};

const groupedCommand = (row: ToolCallUpdate): string | undefined =>
  toolCallFacts(row).explores ? undefined : toolCallFacts(row).command;

function commandLabelProps(
  row: ToolCallUpdate,
): Pick<ToolCallDisclosureProps, 'label' | 'paths'> | undefined {
  const command = groupedCommand(row)?.trim();

  return command ? { label: command, paths: [command] } : undefined;
}

type DisclosureProps = Pick<
  ToolCallDisclosureProps,
  'label' | 'paths' | 'awaitingApproval' | 'permissionOutcome'
>;

const standardDisclosureProps = (
  row: ToolCallUpdate,
  awaitingApproval: boolean,
): DisclosureProps => ({
  label: toolCallTitle(row, awaitingApproval),
  paths: toolCallTitlePaths(row, awaitingApproval),
  awaitingApproval,
  permissionOutcome: toolCallFacts(row).permissionOutcome,
});

const groupedLabelProps = (
  row: ToolCallUpdate,
  showCommand?: boolean,
): ReturnType<typeof commandLabelProps> =>
  showCommand ? commandLabelProps(row) : undefined;

export function toolCallDisclosureProps(
  row: ToolCallUpdate,
  awaitingApproval = false,
  showCommand?: boolean,
): DisclosureProps {
  const props = standardDisclosureProps(row, awaitingApproval);

  return awaitingApproval
    ? props
    : { ...props, ...groupedLabelProps(row, showCommand) };
}

const isRejected = (outcome?: Outcome): boolean | undefined =>
  chosenPermissionKind(outcome)?.startsWith('reject');

function ToolCallPermissionOutcome({
  outcome,
}: {
  outcome?: Outcome;
}): React.JSX.Element | null {
  return outcome ? <PermissionOutcome outcome={outcome} /> : null;
}

export function ToolCallDisclosure({
  permissionOutcome,
  ...props
}: ToolCallDisclosureProps): React.JSX.Element {
  return (
    <View className="max-w-full gap-1">
      <FeedDisclosure {...props} denied={isRejected(permissionOutcome)} />
      <ToolCallPermissionOutcome outcome={permissionOutcome} />
    </View>
  );
}
