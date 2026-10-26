import { InspectorPane } from '@repo/kit/primitives/scaffolds/inspector';
import type * as React from 'react';
import { View } from 'react-native';
import { subagentStates } from '../subagent-list/subagent-list.mocks';
import { SubagentSheet } from '../subagent-list/subagent-sheet';
import { SubagentFeed } from './subagent-feed';
import type { SubagentFeedProps } from './subagent-feed-props';

const ignore = (): void => {};

const tabs = {
  items: [
    { key: 'changes', label: 'Changes', icon: 'diff' as const },
    {
      key: 'subagents',
      label: 'Agents',
      icon: 'agent' as const,
      count: subagentStates.severalMixed.length,
      countTone: 'success' as const,
    },
  ],
  selected: 'subagents',
  onSelect: ignore,
  onClose: ignore,
};

const paneProps = {
  title: 'Agents',
  open: true,
  onOpenChange: ignore,
  tabs,
};

// The Inspector's Subagents tab, drilled in to one Subagent's Feed.
export function SubagentFeedInspector(
  props: SubagentFeedProps,
): React.JSX.Element {
  return (
    <View className="h-175 w-frame-inspector self-end">
      <InspectorPane {...paneProps}>
        <SubagentFeed {...props} />
      </InspectorPane>
    </View>
  );
}

// The phone Sheet: the Subagents list with the open Subagent's Feed pushed over it.
export function SubagentFeedSheet(props: SubagentFeedProps): React.JSX.Element {
  return (
    <SubagentSheet
      subagents={subagentStates.severalMixed}
      open
      onOpenChange={ignore}
      onSelect={ignore}
      now={props.now}
      feed={props}
    />
  );
}
