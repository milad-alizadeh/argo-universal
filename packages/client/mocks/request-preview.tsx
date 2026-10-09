import type { RequestMock } from '@repo/mocks/app';
import type * as React from 'react';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { CommandRow } from '../src/components/command-row';
import { ToolCallGroup } from '../src/components/tool-call-group';
import { ToolCallRow } from '../src/components/tool-call-row';
import { toFeedView } from '../src/feed/to-feed-view';
import { permissionMock } from './request-mock';
export function RequestFrame({
  children,
}: {
  children: ReactNode;
}): React.JSX.Element {
  return (
    <View className="w-full items-center p-4 wide:px-6">
      <View className="w-full max-w-composer">{children}</View>
    </View>
  );
}

export function PermissionFeedPreview({
  mock = permissionMock,
  answered = false,
}: {
  mock?: RequestMock;
  answered?: boolean;
}): React.JSX.Element {
  const state = answered ? mock.answered : mock.pending;
  const groups = toFeedView(state.rows, state.snapshot).items.filter(
    (item) => item.type === 'group',
  );
  return (
    <View className="w-full gap-4">
      {groups.map((group) => (
        <ToolCallGroup
          key={group.id}
          group={group}
          renderActivity={(activity) => {
            if (activity.type !== 'tool_call') return null;
            return activity.row.content.some(
              (block) => block.type === 'terminal',
            ) ? (
              <CommandRow
                row={activity.row}
                awaitingApproval={activity.awaitingApproval}
              />
            ) : (
              <ToolCallRow
                row={activity.row}
                awaitingApproval={activity.awaitingApproval}
              />
            );
          }}
        />
      ))}
    </View>
  );
}
