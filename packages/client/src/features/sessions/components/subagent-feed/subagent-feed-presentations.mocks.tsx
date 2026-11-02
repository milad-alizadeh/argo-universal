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

/*
 * The Inspector's Subagents tab, drilled in to one Subagent's Feed. Expanded, it fills the Session's width and the
 * Feed's column centres in the pane.
 */
export function SubagentFeedInspector({
  expanded,
  ...props
}: SubagentFeedProps & { expanded?: boolean }): React.JSX.Element {
  return (
    <View
      className={expanded ? 'h-175 w-full' : 'h-175 w-frame-inspector self-end'}
    >
      <InspectorPane {...paneProps}>
        <SubagentFeed {...props} />
      </InspectorPane>
    </View>
  );
}

const sheetProps = {
  subagents: subagentStates.severalMixed,
  open: true,
  onOpenChange: ignore,
  onSelect: ignore,
};

// The phone Sheet: the Subagents list with the open Subagent's Feed pushed over it.
export function SubagentFeedSheet(props: SubagentFeedProps): React.JSX.Element {
  const { subagent, onBack } = props;

  return (
    <SubagentSheet
      {...sheetProps}
      now={props.now}
      feed={{ subagent, onBack, content: <SubagentFeed {...props} /> }}
    />
  );
}
