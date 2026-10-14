import type * as React from 'react';
import { FieldSection } from '#lib/generic/primitives/fields/field-section/field-section';
import { ListItem } from '#lib/generic/primitives/lists/list-item/list-item';
import type { AgentRowEntry } from '../../state/agent-status';
import {
  type ReadinessHandlers,
  ReadinessSection,
} from '../agent-readiness/agent-readiness';

// The Agent's saved Readiness as the Agents list reports it; Checking… until the first check lands.
export type CustomAgentReadiness = Pick<AgentRowEntry, 'status' | 'reason'>;
type StatusProps = ReadinessHandlers & {
  name: string;
  readiness: CustomAgentReadiness;
};

// A Ready Agent that offers sign-in methods can still switch accounts.
function AnsweredSection({
  onSignIn,
}: Pick<ReadinessHandlers, 'onSignIn'>): React.JSX.Element {
  return (
    <FieldSection title="Status">
      <ListItem icon="check" title="Answered ACP initialize" />
      {onSignIn && (
        <ListItem title="Sign in" tone="accent" onPress={onSignIn} />
      )}
    </FieldSection>
  );
}

// The last ACP initialize: answered, running, or what it observed and the one thing to do about it.
export function CustomReadinessSection(
  props: StatusProps,
): React.JSX.Element | null {
  const { readiness, ...handlers } = props;
  if (readiness.status === 'ready') return <AnsweredSection {...handlers} />;
  return (
    <ReadinessSection
      {...handlers}
      status={readiness.status}
      reason={readiness.reason}
    />
  );
}
