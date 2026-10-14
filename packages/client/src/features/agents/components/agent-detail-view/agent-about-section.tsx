import type * as React from 'react';
import { FieldSection } from '#lib/generic/primitives/fields/field-section/field-section';
import { ListItem } from '#lib/generic/primitives/lists/list-item/list-item';
import type {
  AgentDetail,
  AgentDetailViewProps,
} from '../../state/agent-detail-types';
import { isInstalled } from '../../state/agent-status';
import { AgentLinks } from './agent-links';

type AgentProps = { agent: AgentDetail };

const hasAbout = ({ agent }: AgentProps): boolean =>
  [agent.version, agent.distribution, agent.source, agent.links?.length].some(
    Boolean,
  );

// A registry Agent not yet installed names where the page found it.
const registrySource = (agent: AgentDetail): string | undefined =>
  agent.status === 'not-installed' ? 'ACP Registry' : undefined;

// Where the Agent comes from: its registry version, where it was found or how the Server installs it, and its links.
export function AboutSection(
  props: AgentDetailViewProps,
): React.JSX.Element | null {
  const { agent } = props;

  if (!hasAbout({ agent })) return null;

  return (
    <FieldSection title="About">
      <AboutRow title="Source" value={registrySource(agent)} />
      <VersionRow {...props} />
      {agent.source ? <ListItem title={agent.source} /> : null}
      <AboutRow title="Distribution" value={agent.distribution} />
      <AgentLinks links={agent.links} />
    </FieldSection>
  );
}

// Update lives in the Status section; the row only says from which version to which.
function VersionRow(props: AgentDetailViewProps): React.JSX.Element | null {
  if (!props.agent.version) return null;

  return <ListItem title="Version" value={versionLine(props.agent)} />;
}

function AboutRow(props: {
  title: string;
  value?: string;
}): React.JSX.Element | null {
  if (!props.value) return null;

  return <ListItem title={props.title} value={props.value} />;
}

type ShownAgent = AgentDetailViewProps['agent'];

// The Server sends an Agent version only when it differs from the Adapter's.
const installedLine = (agent: ShownAgent): string =>
  [
    `Adapter ${agent.version}`,
    agent.agentVersion && `${agent.name} ${agent.agentVersion}`,
  ]
    .filter(Boolean)
    .join(' · ');

const updateLine = (agent: ShownAgent): string =>
  agent.availableVersion
    ? `v${agent.version} → v${agent.availableVersion}`
    : installedLine(agent);

const installedLines = (agent: ShownAgent): string =>
  agent.status === 'update-available'
    ? updateLine(agent)
    : installedLine(agent);

// Paper: the catalog's release before install, from → to when an update is out, else the Adapter and the Agent.
const versionLine = (agent: ShownAgent): string =>
  isInstalled(agent) ? installedLines(agent) : `v${agent.version}`;
