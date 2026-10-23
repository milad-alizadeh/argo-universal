import { FieldGroup } from '@repo/kit/primitives/fields/field-group';
import type { ReactElement } from 'react';
import type { ComposerConfigurationProps } from './configuration-types';
import { agentName } from './configuration-values';

type Props = { configuration: ComposerConfigurationProps };

/*
 * The Agent, where it can still be chosen or where nothing else names it. Once a Session is running the Agent is
 * fixed and the page is titled with its name; a row that repeats the title and does nothing collides with the
 * Agents' own options, which are free to call themselves anything, "Agent" included (owner, 2026-10-20). An Agent
 * that is not installed has no name to title the page with, so its row stays and says its id.
 */
export function agentRow(
  configuration: Props['configuration'],
): ReactElement | null {
  const { agentChoices } = configuration;

  return agentChoices
    ? agentPicker(configuration, agentChoices)
    : agentValue(configuration);
}

function agentValue({
  agent,
  agentId,
}: Props['configuration']): ReactElement | null {
  if (agent || !agentId) return null;

  return <FieldGroup.Value key="agent" title="Agent" value={agentId} />;
}

type Cfg = Props['configuration'];

type Choices = NonNullable<Cfg['agentChoices']>;

function agentPicker(configuration: Cfg, choices: Choices): ReactElement {
  return (
    <FieldGroup.Picker
      key="agent"
      title="Agent"
      presentation="page"
      value={configuration.agent?.id ?? ''}
      summary={agentSummary(configuration)}
      options={agentOptions(choices)}
      onValueChange={choices.onChange}
      footerAction={{ label: 'Add Agents', onPress: choices.onAdd }}
    />
  );
}

const agentOptions = (choices: Choices): { value: string; label: string }[] =>
  choices.agents.map(({ id, name }) => ({ value: id, label: name }));

const agentSummary = (configuration: Cfg): string =>
  agentName(configuration.agent, configuration.agentId) || 'Choose Agent';
