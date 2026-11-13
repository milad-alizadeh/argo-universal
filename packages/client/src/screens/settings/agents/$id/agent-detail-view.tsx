import type { AgentServerEnvironment } from '@repo/contracts';
import { Button } from '@repo/kit/primitives/actions/button';
import { FieldGroup } from '@repo/kit/primitives/fields/field-group';
import { Screen } from '@repo/kit/primitives/scaffolds/screen';
import type * as React from 'react';
import { SettingsLoading } from '#features/settings';
import { TextRow } from '../../plugins/$id/plugin-text-rows';
import { newVariableSection, useNewVariable } from './agent-new-variable';

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

export const valueLabel = 'Value';

export const removeLabel = (name: string): string => `Remove ${name}`;

// One Installed Agent, as iOS Settings shows one App: a section per variable of its launch environment, then the one that adds another.
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

type LoadedAgent = Extract<AgentLoad, { status: 'loaded' }>;

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
  env: LoadedAgent['env'];
  onChange: BodyProps['onEnvironmentChange'];
};

const without = (
  env: AgentServerEnvironment,
  name: string,
): AgentServerEnvironment =>
  Object.fromEntries(Object.entries(env).filter(([key]) => key !== name));

// FieldGroup finds its sections by element type, so each is an element built here, not a component.
function Environment(props: EnvironmentProps): React.JSX.Element {
  const draft = useNewVariable(props.env, props.onChange);

  return (
    <FieldGroup>
      {variableSections(props)}
      {newVariableSection(draft)}
    </FieldGroup>
  );
}

const variableSections = ({
  env,
  onChange,
}: EnvironmentProps): React.JSX.Element[] =>
  Object.entries(env).map(([name, value]) =>
    variableSection({
      name,
      value,
      onSave: (next) => onChange({ ...env, [name]: next }),
      onRemove: () => onChange(without(env, name)),
    }),
  );

type VariableProps = {
  name: string;
  value: string;
  onSave: (value: string) => void;
  onRemove: () => void;
};

const variableSection = (props: VariableProps): React.JSX.Element => (
  <FieldGroup.Section key={props.name} title={props.name}>
    <TextRow
      key={props.value}
      label={valueLabel}
      value={props.value}
      onSave={props.onSave}
    />
    <Button
      label={removeLabel(props.name)}
      variant="text"
      onPress={props.onRemove}
    />
  </FieldGroup.Section>
);
