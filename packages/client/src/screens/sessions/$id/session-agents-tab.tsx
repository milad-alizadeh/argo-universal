import {
  InspectorScreen,
  InspectorScreens,
} from '@repo/kit/primitives/scaffolds/inspector';
import { ScrollFadeView } from '@repo/kit/scroll-fade/scroll-fade';
import type { ReactNode } from 'react';
import {
  SubagentList,
  type SubagentListProps,
  type SubagentFeedProps,
} from '#features/sessions';
import type { OpenSubagentFeed } from './session-inspector-content';

export type AgentFeedSlot = (
  props: Pick<SubagentFeedProps, 'subagent' | 'onBack'>,
) => ReactNode;

type Props = SubagentListProps & {
  renderFeed?: AgentFeedSlot;
  open?: OpenSubagentFeed;
};

// The Session owns which Subagent is open, so a Feed row can open one here; the tab only draws it.
export function SessionAgentsTab(props: Props): ReactNode {
  return <AgentPages {...props} detail={agentDetail(props)} />;
}

const openFeed = (props: Props): Parameters<AgentFeedSlot>[0] | undefined => {
  const subagent = props.subagents.find(
    (one) => one.sessionId === props.open?.sessionId,
  );

  return subagent && props.open && { subagent, onBack: props.open.onBack };
};

function agentDetail(props: Props): ReactNode {
  const feed = openFeed(props);

  return feed && props.renderFeed?.(feed);
}

function AgentPages(
  props: SubagentListProps & { detail: ReactNode },
): ReactNode {
  return (
    <InspectorScreens>
      <InspectorScreen active={!props.detail} label="Agents list">
        <AgentList {...props} />
      </InspectorScreen>
      <AgentDetail detail={props.detail} />
    </InspectorScreens>
  );
}

function AgentDetail({ detail }: { detail: ReactNode }): ReactNode {
  return (
    detail && (
      <InspectorScreen active label="Agent Feed">
        {detail}
      </InspectorScreen>
    )
  );
}

function AgentList(props: SubagentListProps): ReactNode {
  return (
    <ScrollFadeView
      testID="desktop-inspector-scroll"
      contentContainerClassName="grow"
    >
      <SubagentList {...props} />
    </ScrollFadeView>
  );
}
