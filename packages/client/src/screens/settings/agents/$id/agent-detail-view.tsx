import type { AgentServerEnvironment } from '@repo/contracts';
import { FieldGroup } from '@repo/kit/primitives/fields/field-group';
import { Screen } from '@repo/kit/primitives/scaffolds/screen';
import type * as React from 'react';
import { SettingsLoading, useEnvironmentSection } from '#features/settings';

export type AgentLoad =
  | { status: 'loading' }
  | { status: 'missing' }
  | { status: 'loaded'; env: AgentServerEnvironment };

export interface AgentDetailViewProps {
  // The Agent's name, or its id until the Installed Agents load.
  title: string;
  agent: AgentLoad;
  // The whole launch environment after one change; the Server replaces what it saved.
  onEnvironmentChange: (env: AgentServerEnvironment) => void;
  onBack?: () => void;
}

const environmentTitle = 'Environment';

export const environmentFooter =
  'The variables the Agent starts with, one per line. Clear a line to remove it. A change applies from the Agent’s next Session.';

// One Installed Agent, as iOS Settings shows one App: its launch environment, a line per variable, as a `.env` file reads.
export function AgentDetailView(
  props: AgentDetailViewProps,
): React.JSX.Element {
  const { onBack, ...body } = props;

  return (
    <Screen title={props.title} onBack={onBack}>
      <AgentBody {...body} />
    </Screen>
  );
}

type BodyProps = Omit<AgentDetailViewProps, 'onBack'>;

function AgentBody(props: BodyProps): React.JSX.Element {
  const { agent } = props;

  if (agent.status === 'loading')
    return <SettingsLoading label="Loading the Agent…" />;

  if (agent.status === 'missing')
    return <FieldGroup>{missingSection(props.title)}</FieldGroup>;

  return <Environment env={agent.env} onChange={props.onEnvironmentChange} />;
}

const missingSection = (title: string): React.JSX.Element => (
  <FieldGroup.Section>
    <FieldGroup.Value
      title={`The Server has no Installed Agent named ${title}.`}
      value=""
    />
  </FieldGroup.Section>
);

type EnvironmentProps = {
  env: AgentServerEnvironment;
  onChange: BodyProps['onEnvironmentChange'];
};

function Environment(props: EnvironmentProps): React.JSX.Element {
  const section = useEnvironmentSection({
    ...props,
    id: environmentTitle,
    title: environmentTitle,
    footer: environmentFooter,
  });

  return <FieldGroup>{section}</FieldGroup>;
}
