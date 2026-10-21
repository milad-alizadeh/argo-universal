import { useState, type ReactNode } from 'react';
import {
  SubagentList,
  type SubagentListProps,
  type SubagentFeedProps,
} from '#features/sessions';
import { ScrollFadeView } from '../../../lib/generic/scroll-fade/scroll-fade';

export type AgentFeedSlot = (
  props: Pick<SubagentFeedProps, 'subagent' | 'onBack'>,
) => ReactNode;

type Props = SubagentListProps & { renderFeed?: AgentFeedSlot };

// Selection belongs to this retained tab; opening another tab never navigates away from its detail.
export function SessionAgentsStage(props: Props): ReactNode {
  const [selected, select] = useState<string | null>(null);
  const subagent = props.subagents.find((one) => one.sessionId === selected);

  if (subagent && props.renderFeed)
    return props.renderFeed({ subagent, onBack: () => select(null) });

  return (
    <AgentList
      {...props}
      onSelect={(one) => {
        select(one.sessionId);
        props.onSelect?.(one);
      }}
    />
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
