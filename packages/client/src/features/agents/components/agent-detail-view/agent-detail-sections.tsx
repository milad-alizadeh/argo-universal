import type * as React from 'react';
import { FieldSection } from '#lib/generic/primitives/fields/field-section/field-section';
import { ListItem } from '#lib/generic/primitives/lists/list-item/list-item';
import { CopyButton } from '#lib/product/markdown/copy-button';
import { SelectMenu } from '../../../../lib/generic/primitives/inputs/select-menu/select-menu';
import type {
  AgentDetail,
  AgentDetailViewProps,
  SessionDefault,
} from '../../state/agent-detail-types';
import { agentStatusLabels, statusTone } from '../../state/agent-status';
import { CheckAgainRow } from '../check-again-row';
import { AgentLinks } from './agent-links';

type AgentProps = { agent: AgentDetail };

const statusFooters: Partial<Record<AgentDetail['status'], string>> = {
  unavailable: 'The Server could not start this Agent. Check again later.',
};
const signInFooter = 'Run this in a terminal on the Server, then check again.';

// Where an installed Agent stands, when the chip alone does not say what to do.
export function AgentStatusSection(
  props: AgentDetailViewProps,
): React.JSX.Element | null {
  const { status } = props.agent;
  if (status === 'sign-in') return <SignInSection {...props} />;
  return statusFooters[status] ? <StatusRow {...props} /> : null;
}

function StatusRow({ agent }: AgentProps): React.JSX.Element {
  const tone = statusTone(agent.status);
  return (
    <FieldSection title="Status" footer={statusFooters[agent.status]}>
      <ListItem
        title="Status"
        value={agentStatusLabels[agent.status]}
        status={tone ? { tone, label: '' } : undefined}
      />
    </FieldSection>
  );
}

/*
 * Signing in happens in a terminal on the Server; the page offers the probe's
 * step and a fresh probe. The step is prose ("Run codex login and sign in…"),
 * not a bare command, so it reads as body text rather than code.
 */
function SignInSection(props: AgentDetailViewProps): React.JSX.Element {
  return (
    <FieldSection
      title="Status"
      footer={props.onSignIn ? undefined : signInFooter}
    >
      <ListItem title="Not signed in" status={{ tone: 'warning', label: '' }} />
      <SignInAction {...props} />
      <CheckAgainRow onPress={props.onCheckAgain} />
    </FieldSection>
  );
}

function SignInCommand({
  command,
}: {
  command?: string;
}): React.JSX.Element | null {
  if (!command) return null;
  return (
    <ListItem
      title={command}
      accessory={
        <CopyButton value={command} label="Copy command" className="size-7" />
      }
    />
  );
}

const defaultsFooter =
  'The model a new Session starts with. More effort thinks longer and uses more of your plan.';
const modeFooter = 'Mode is what the Agent may do without asking you first.';
// ADR-0022: each Device keeps its own New Sessions defaults.
const deviceFooter =
  'These choices apply to Sessions you start on this Device.';

const footerFor = (defaults: readonly SessionDefault[]): string =>
  [
    defaultsFooter,
    defaults.some(({ label }) => label === 'Mode') && modeFooter,
    deviceFooter,
  ]
    .filter(Boolean)
    .join(' ');
type DefaultProps = Pick<AgentDetailViewProps, 'onDefaultChange'> & {
  choice: SessionDefault;
};

const offeredDefaults = ({
  agent,
  defaults = [],
}: AgentDetailViewProps): readonly SessionDefault[] =>
  agent.status === 'sign-in' ? [] : defaults;

// The model, effort and mode a new Session with this Agent starts with, as plain pickers; none until it is signed in.
export function DefaultsSection(
  props: AgentDetailViewProps,
): React.JSX.Element | null {
  const defaults = offeredDefaults(props);
  if (!defaults.length) return null;
  return (
    <FieldSection title="New Sessions" footer={footerFor(defaults)}>
      {defaults.map((choice) => (
        <DefaultRow key={choice.id} choice={choice} {...props} />
      ))}
    </FieldSection>
  );
}

function DefaultRow(props: DefaultProps): React.JSX.Element {
  return (
    <ListItem
      title={props.choice.label}
      accessory={<DefaultPicker {...props} />}
    />
  );
}

function DefaultPicker({
  choice,
  onDefaultChange,
}: DefaultProps): React.JSX.Element {
  return (
    <SelectMenu
      variant="plain"
      accessibilityLabel={choice.label}
      value={choice.value}
      options={choice.options}
      onValueChange={(value) => onDefaultChange?.(choice.id, value)}
    />
  );
}

const hasAbout = ({ agent }: AgentProps): boolean =>
  [agent.version, agent.distribution, agent.links?.length].some(Boolean);

// A registry Agent not yet installed names where the page found it.
const registrySource = (agent: AgentDetail): string | undefined =>
  agent.status === 'not-installed' ? 'ACP Registry' : undefined;

// Where the Agent comes from: its registry version, how the Server installs it, and its links.
export function AboutSection({ agent }: AgentProps): React.JSX.Element | null {
  if (!hasAbout({ agent })) return null;
  return (
    <FieldSection title="About">
      <AboutRow title="Source" value={registrySource(agent)} />
      <AboutRow title="Version" value={agent.version && `v${agent.version}`} />
      <AboutRow title="Distribution" value={agent.distribution} />
      <AgentLinks links={agent.links} />
    </FieldSection>
  );
}

function AboutRow(props: {
  title: string;
  value?: string;
}): React.JSX.Element | null {
  if (!props.value) return null;
  return <ListItem title={props.title} value={props.value} />;
}

function SignInAction(props: AgentDetailViewProps): React.JSX.Element | null {
  if (props.onSignIn)
    return <ListItem title="Sign in" tone="accent" onPress={props.onSignIn} />;
  return <SignInCommand command={props.agent.signInCommand} />;
}
