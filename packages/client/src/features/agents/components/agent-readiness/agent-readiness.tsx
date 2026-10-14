import type * as React from 'react';
import {
  type AgentStatus,
  agentStatusLabels,
  statusTone,
} from '../../state/agent-status';
import {
  type ReadinessAction,
  readinessActionLabels,
  readinessCopy,
} from '../../state/readiness-copy';
import {
  StatusButton,
  StatusSection,
} from '../agent-status-section/agent-status-section';

export type ReadinessHandlers = {
  onRecheck?: () => void;
  onSignIn?: () => void;
  onRepair?: () => void;
};

export type AgentReadinessProps = ReadinessHandlers & {
  name: string;
  status: AgentStatus;
  reason?: string;
};

// What the last Readiness check observed: the status, the reason in the footer, and its one action.
export function ReadinessSection(
  props: AgentReadinessProps,
): React.JSX.Element | null {
  const copy = readinessCopy(props);

  if (!copy) return null;

  return (
    <StatusSection
      label={agentStatusLabels[props.status]}
      tone={statusTone(props.status)}
      footer={copy.footer}
      failure={copy.failure}
      action={readinessButton(props, copy.action)}
    />
  );
}

const readinessButton = (
  handlers: ReadinessHandlers,
  action: ReadinessAction | undefined,
): React.JSX.Element | null =>
  action ? <ReadinessButton {...handlers} action={action} /> : null;

const handlerFor = (
  action: ReadinessAction,
  handlers: ReadinessHandlers,
): (() => void) | undefined =>
  ({
    'sign-in': handlers.onSignIn,
    'sign-in-again': handlers.onSignIn,
    recheck: handlers.onRecheck,
    repair: handlers.onRepair,
  })[action];

type ActionProps = ReadinessHandlers & { action: ReadinessAction };

// Drawn disabled while the page cannot act, such as during a Recheck; Checking… and Not compatible have none.
function ReadinessButton(props: ActionProps): React.JSX.Element {
  return (
    <StatusButton
      label={readinessActionLabels[props.action]}
      onPress={handlerFor(props.action, props)}
    />
  );
}
