import type { AgentServerEnvironment } from '@repo/contracts';
import { FieldGroup } from '@repo/kit/primitives/fields/field-group';
import { Screen } from '@repo/kit/primitives/scaffolds/screen';
import type * as React from 'react';
import { useState } from 'react';
import { SettingsLoading } from '#features/settings';
import { useTextDraft } from '../../plugins/$id/plugin-text-rows';
import { changeLine, environmentLine } from './agent-environment-lines';

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

export const newLinePlaceholder = 'NAME=value';

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

type OnLine = (current: string | undefined, text: string) => void;

type Lines = { error: string | undefined; onLine: OnLine };

// A line's text is saved when its field loses focus; one the environment cannot take says why in the footer instead.
function useLines({ env, onChange }: EnvironmentProps): Lines {
  const [error, setError] = useState<string>();

  const onLine: OnLine = (current, text) => {
    const change = changeLine(env, current, text);
    setError(change.saved ? undefined : change.error);

    if (change.saved) onChange(change.env);
  };

  return { error, onLine };
}

function Environment(props: EnvironmentProps): React.JSX.Element {
  const { error, onLine } = useLines(props);

  return (
    <FieldGroup>
      <FieldGroup.Section
        title={environmentTitle}
        footer={error ?? environmentFooter}
      >
        {savedLines(props.env, onLine)}
        {newLine(props.env, onLine)}
      </FieldGroup.Section>
    </FieldGroup>
  );
}

// A line is keyed by its text, so a save resets its draft.
const savedLines = (
  env: AgentServerEnvironment,
  onLine: OnLine,
): React.JSX.Element[] =>
  Object.entries(env).map(([name, value]) => (
    <Line
      key={environmentLine(name, value)}
      name={name}
      text={environmentLine(name, value)}
      onSave={(text) => onLine(name, text)}
    />
  ));

// The empty last line adds a variable, and is a new field once it has.
const newLine = (
  env: AgentServerEnvironment,
  onLine: OnLine,
): React.JSX.Element => (
  <Line
    key={`new:${Object.keys(env).length}`}
    text=""
    onSave={(text) => onLine(undefined, text)}
  />
);

type LineProps = {
  // The variable the line shows; none for the empty last line.
  name?: string;
  text: string;
  onSave: (text: string) => void;
};

const lineLabel = (name?: string): string =>
  name ? `Variable ${name}` : 'New variable';

function Line({ name, text, onSave }: LineProps): React.JSX.Element {
  return (
    <FieldGroup.TextField
      title={lineLabel(name)}
      hideTitle
      placeholder={newLinePlaceholder}
      {...useTextDraft(text, onSave)}
    />
  );
}
