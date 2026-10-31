import { FieldGroup } from '@repo/kit/primitives/fields/field-group';
import type { ReactElement } from 'react';
import type { ComposerConfigurationProps } from './configuration-types';
import { agentName } from './configuration-values';
import type { AgentPick } from './use-agent-pick';

type Props = { configuration: ComposerConfigurationProps };

/*
 * The Agent, where it can still be chosen or where nothing else names it. Once a Session is running the Agent is
 * fixed and the page is titled with its name; a row that repeats the title and does nothing collides with the
 * Agents' own options, which are free to call themselves anything, "Agent" included (owner, 2026-10-20). An Agent
 * that is not installed has no name to title the page with, so its row stays and says its id.
 */
export function agentRow(
  configuration: Props['configuration'],
  picking: AgentPick,
): ReactElement | null {
  const { agentChoices } = configuration;

  return agentChoices
    ? agentPicker({ configuration, choices: agentChoices, picking })
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

type PickerProps = React.ComponentProps<typeof FieldGroup.Picker>;

interface PickerContext {
  configuration: Cfg;
  choices: Choices;
  picking: AgentPick;
}

// A page of its own; with no Agents installed it says so and where they are added, which the page's one action opens.
const pickerLook = {
  title: 'Agent',
  leading: 'agent',
  presentation: 'page',
  emptyText: 'No Agents installed. Use Add Agents to install one.',
} as const;

function agentPicker(context: PickerContext): ReactElement {
  return (
    <FieldGroup.Picker
      key="agent"
      {...pickerLook}
      value={context.configuration.agent?.id ?? ''}
      summary={agentSummary(context.configuration)}
      options={agentOptions(context)}
      onValueChange={context.picking.pick}
      footerAction={addAgents(context.choices)}
    />
  );
}

// Opens the Agents page; on a phone it is the picker page's header button.
const addAgents = (choices: Choices): PickerProps['footerAction'] => ({
  label: 'Add Agents',
  icon: 'add',
  onPress: choices.onAdd,
});

/*
 * Each Agent's own logo where the row can draw an image, the Agent glyph where it cannot (a phone's native list), and a
 * spinner on the Agent whose settings are on their way: the page holds until they are in.
 */
const agentOptions = ({
  choices,
  picking,
}: PickerContext): PickerProps['options'] =>
  choices.agents.map(({ id, name, icon }) => ({
    value: id,
    label: name,
    icon: 'agent',
    logo: icon,
    pending: picking.pending === id,
  }));

const agentSummary = (configuration: Cfg): string =>
  agentName(configuration.agent, configuration.agentId) || 'Choose Agent';
