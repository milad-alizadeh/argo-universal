import type * as React from 'react';
import type { AgentDetailViewProps } from '../../state/agent-detail-types';
import { agentStatusLabels, statusTone } from '../../state/agent-status';
import { readinessCopy } from '../../state/readiness-copy';
import { ReadinessSection } from '../agent-readiness/agent-readiness';
import { StatusSection } from '../agent-status-section/agent-status-section';
import { AgentAction } from './agent-detail-actions';

// Where the Agent stands, with the observed reason and its one action; the page's only status.
export function AgentStatusSection(
  props: AgentDetailViewProps,
): React.JSX.Element {
  if (readinessCopy(props.agent)) return <AgentReadiness {...props} />;

  return <InstallationStatus {...props} />;
}

function AgentReadiness(props: AgentDetailViewProps): React.JSX.Element | null {
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

// Ready, Update available, Not installed and Disabled: the status, then Install or Update when it needs one.
function InstallationStatus(props: AgentDetailViewProps): React.JSX.Element {
  const { status } = props.agent;

  return (
    <StatusSection
      label={agentStatusLabels[status]}
      tone={statusTone(status)}
      action={<AgentAction {...props} fullWidth="narrow" />}
    />
  );
}

export { AboutSection } from './agent-about-section';
