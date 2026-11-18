import type { LiveHeader, ToolCallUpdate } from '@repo/contracts';
import { Orb } from '@repo/kit/primitives/status/orb';
import type * as React from 'react';
import { toolCallFacts } from '../../view/feed-row-facts';
import type { FeedGroup } from '../../view/feed-view';
import { SourceIcon } from '../live-header/live-header';
import {
  type ToolCallDisclosure,
  toolCallDisclosureProps,
} from '../tool-call-disclosure';
import { toolCallIcon } from '../tool-call-icon';
import { toolCallOrb } from '../tool-call-orb';
import {
  groupSummary,
  headerLiveCall,
  headerToolCall,
  liveToolCall,
} from './group-activities';

type GroupDisclosureProps = Pick<
  React.ComponentProps<typeof ToolCallDisclosure>,
  | 'label'
  | 'leading'
  | 'icon'
  | 'running'
  | 'awaitingApproval'
  | 'permissionOutcome'
>;

function groupDisclosureProps(group: FeedGroup): GroupDisclosureProps {
  const live = headerLiveCall(group);
  const leading = groupLeading(group, live?.toolCall);

  return live
    ? {
        ...toolCallDisclosureProps(live.toolCall, live.awaitingApproval),
        icon: toolCallIcon(live.toolCall),
        running: group.state === 'open',
        leading,
      }
    : { ...groupSummaryProps(group), leading };
}

const waitsOnApproval = (group: FeedGroup): boolean =>
  liveToolCall(group)?.awaitingApproval === true;

const drawsOrb = (group: FeedGroup): boolean =>
  group.state === 'open' && !waitsOnApproval(group);

function groupLeading(
  group: FeedGroup,
  toolCall?: ToolCallUpdate,
): React.JSX.Element | undefined {
  return toolCall && toolCallFacts(toolCall).operation
    ? undefined
    : runningOrb(group);
}

// A running group leads with the Orb unless its Tool call has an icon of its own or is waiting for approval.
function runningOrb(group: FeedGroup): React.JSX.Element | undefined {
  if (!drawsOrb(group)) return undefined;

  return (
    <Orb
      size="sm"
      state={toolCallOrb(liveToolCall(group)?.toolCall)}
      continues
    />
  );
}

function groupSummaryProps(group: FeedGroup): GroupDisclosureProps {
  return {
    label: groupSummary(group),
    icon: 'terminal',
    running: group.state === 'open',
    awaitingApproval: liveToolCall(group)?.awaitingApproval,
  };
}

function liveHeaderDisclosureProps(
  group: FeedGroup,
  { source }: LiveHeader,
  title: string,
): Pick<
  React.ComponentProps<typeof ToolCallDisclosure>,
  'label' | 'leading' | 'running'
> {
  return {
    label: title,
    leading: <SourceIcon source={source} toolCall={headerToolCall(group)} />,
    running: source.type !== 'request',
  };
}

export function groupHeaderProps(
  group: FeedGroup,
  liveHeader: LiveHeader | undefined,
  title: string,
):
  | ReturnType<typeof groupDisclosureProps>
  | ReturnType<typeof liveHeaderDisclosureProps> {
  const disclosure = groupDisclosureProps(group);

  return liveHeader
    ? { ...disclosure, ...liveHeaderDisclosureProps(group, liveHeader, title) }
    : disclosure;
}
