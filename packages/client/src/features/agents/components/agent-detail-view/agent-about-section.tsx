import type * as React from 'react';
import { GroupedListItem } from '#primitives/lists/grouped-list-item';
import { GroupedListSection } from '#primitives/lists/grouped-list-section';
import type {
  AgentDetail,
  AgentDetailViewProps,
} from '../../state/agent-detail-types';
import { installationActive } from '../../state/agent-install-phase';
import { AgentAction } from './agent-detail-actions';
import { agentLinks } from './agent-links';

type AgentProps = { agent: AgentDetail };

const hasAbout = ({ agent }: AgentProps): boolean =>
  [agent.version, agent.distribution, agent.links?.length].some(Boolean);

// A registry Agent not yet installed names where the page found it.
const registrySource = (agent: AgentDetail): string | undefined =>
  agent.status === 'not-installed' ? 'ACP Registry' : undefined;

/*
 * Where the Agent comes from: its registry version, how the Server installs it, and its links.
 * GroupedList takes its sections, and each section its rows, as direct children, so this is called rather than rendered.
 */
export function aboutSection(
  props: AgentDetailViewProps,
  wide: boolean,
): React.JSX.Element | null {
  const { agent } = props;

  if (!hasAbout({ agent })) return null;

  return (
    <GroupedListSection key="about" title="About">
      {aboutRow('Source', registrySource(agent))}
      {versionRow(props, wide)}
      {aboutRow('Distribution', agent.distribution)}
      {agentLinks(agent.links)}
    </GroupedListSection>
  );
}

function versionRow(
  props: AgentDetailViewProps,
  wide: boolean,
): React.JSX.Element | null {
  if (!props.agent.version) return null;

  return (
    <GroupedListItem
      label="Version"
      value={`v${props.agent.version}`}
      accessory={versionAccessory(props, wide)}
    />
  );
}

function aboutRow(
  title: string,
  value: string | undefined,
): React.JSX.Element | null {
  if (!value) return null;

  return <GroupedListItem label={title} value={value} />;
}

const versionAccessory = (
  props: AgentDetailViewProps,
  wide: boolean,
): React.JSX.Element | undefined =>
  wide && showsUpdate(props) ? <AgentAction {...props} /> : undefined;

const showsUpdate = (props: AgentDetailViewProps): boolean =>
  props.agent.status === 'update' || openUpdate(props.installation);

const openUpdate = (
  installation: AgentDetailViewProps['installation'],
): boolean =>
  installation?.action === 'Update' && installationActive(installation);
