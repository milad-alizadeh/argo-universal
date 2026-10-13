import type {
  PermissionOutcome as Outcome,
  ToolCallUpdate,
} from '@repo/contracts';
import type * as React from 'react';
import { View } from 'react-native';
import { toolCallTitle, toolCallTitlePaths } from '../view/tool-call-title';
import { FeedDisclosure, type FeedDisclosureProps } from './feed-disclosure';
import { chosenPermissionKind, PermissionOutcome } from './permission-outcome';
import { argoMeta } from './tool-call-meta';

type ToolCallDisclosureProps = Omit<FeedDisclosureProps, 'denied'> & {
  permissionOutcome?: Outcome;
  permissionMessage?: string;
};

export function toolCallDisclosureProps(
  row: ToolCallUpdate,
  awaitingApproval = false,
): Pick<
  ToolCallDisclosureProps,
  'label' | 'paths' | 'awaitingApproval' | 'permissionOutcome'
> {
  return {
    label: toolCallTitle(row, awaitingApproval),
    paths: toolCallTitlePaths(row, awaitingApproval),
    awaitingApproval,
    permissionOutcome: argoMeta(row)?.permissionOutcome,
  };
}

const isRejected = (outcome?: Outcome): boolean | undefined =>
  chosenPermissionKind(outcome)?.startsWith('reject');

function ToolCallPermissionOutcome({
  outcome,
  message,
}: {
  outcome?: Outcome;
  message?: string;
}): React.JSX.Element | null {
  return outcome ? (
    <PermissionOutcome outcome={outcome} message={message} />
  ) : null;
}

export function ToolCallDisclosure({
  permissionOutcome,
  permissionMessage,
  ...props
}: ToolCallDisclosureProps): React.JSX.Element {
  return (
    <View className="gap-1">
      <FeedDisclosure {...props} denied={isRejected(permissionOutcome)} />
      <ToolCallPermissionOutcome
        outcome={permissionOutcome}
        message={permissionMessage}
      />
    </View>
  );
}
