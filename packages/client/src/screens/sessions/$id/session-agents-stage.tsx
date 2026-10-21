import {
  InspectorPage,
  InspectorPages,
} from '@repo/kit/primitives/scaffolds/inspector';
import { ScrollFadeView } from '@repo/kit/scroll-fade/scroll-fade';
import { useState, type ReactNode } from 'react';
import {
  SubagentList,
  type SubagentListProps,
  type SubagentFeedProps,
} from '#features/sessions';

export type AgentFeedSlot = (
  props: Pick<SubagentFeedProps, 'subagent' | 'onBack'>,
) => ReactNode;

type Props = SubagentListProps & { renderFeed?: AgentFeedSlot };

// Selection belongs to this retained tab; opening another tab never navigates away from its detail.
export function SessionAgentsStage(props: Props): ReactNode {
  const [selected, select] = useState<string | null>(null);
  const subagent = props.subagents.find((one) => one.sessionId === selected);

  const detail = agentDetail(props, subagent, () => select(null));

  return (
    <AgentPages
      {...props}
      detail={detail}
      onSelect={(one) => {
        select(one.sessionId);
        props.onSelect?.(one);
      }}
    />
  );
}

function agentDetail(
  props: Props,
  subagent: SubagentFeedProps['subagent'] | undefined,
  onBack: () => void,
): ReactNode {
  if (!subagent || !props.renderFeed) return null;

  return props.renderFeed({ subagent, onBack });
}

function AgentPages(
  props: SubagentListProps & { detail: ReactNode },
): ReactNode {
  return (
    <InspectorPages>
      <InspectorPage active={!props.detail} label="Agents list">
        <AgentList {...props} />
      </InspectorPage>
      <AgentDetail detail={props.detail} />
    </InspectorPages>
  );
}

function AgentDetail({ detail }: { detail: ReactNode }): ReactNode {
  return (
    detail && (
      <InspectorPage active label="Agent Feed">
        {detail}
      </InspectorPage>
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
