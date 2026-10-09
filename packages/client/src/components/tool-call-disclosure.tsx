import type { PermissionOutcome as Outcome } from '@repo/contracts';
import type * as React from 'react';
import { View } from 'react-native';
import { FeedDisclosure, type FeedDisclosureProps } from './feed-disclosure';
import { PermissionOutcome } from './permission-outcome';

export function ToolCallDisclosure({
  permissionOutcome,
  permissionMessage,
  ...props
}: Omit<FeedDisclosureProps, 'denied'> & {
  permissionOutcome?: Outcome;
  permissionMessage?: string;
}): React.JSX.Element {
  return (
    <View className="gap-1">
      <FeedDisclosure
        {...props}
        denied={
          permissionOutcome?.outcome === 'selected' &&
          permissionOutcome.optionId === 'reject_once'
        }
      />
      {permissionOutcome && (
        <PermissionOutcome
          outcome={permissionOutcome}
          message={permissionMessage}
        />
      )}
    </View>
  );
}
