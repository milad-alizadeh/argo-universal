import type * as React from 'react';
import type { AgentDetailViewProps } from '../../state/agent-detail-types';
import { ReadinessSection } from '../agent-readiness/agent-readiness';

// Where an installed Agent stands, with the observed reason and its one action; Ready needs no section.
export function AgentStatusSection(
  props: AgentDetailViewProps,
): React.JSX.Element | null {
  const { agent } = props;
  return (
    <ReadinessSection
      name={agent.name}
      status={agent.status}
      reason={agent.reason}
      onRecheck={props.onRecheck}
      onSignIn={props.onSignIn}
      onRepair={props.onRepair}
    />
  );
}

export { AboutSection } from './agent-about-section';
