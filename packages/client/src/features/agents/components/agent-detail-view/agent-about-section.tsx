import type * as React from 'react';
import { FieldSection } from '#primitives/fields/field-section';
import { ListItem } from '#primitives/lists/list-item';
import { useWide } from '../../../../lib/generic/use-wide/use-wide';
import type {
  AgentDetail,
  AgentDetailViewProps,
} from '../../state/agent-detail-types';
import { installationActive } from '../../state/agent-install-phase';
import { AgentAction } from './agent-detail-actions';
import { AgentLinks } from './agent-links';

type AgentProps = { agent: AgentDetail };

const hasAbout = ({ agent }: AgentProps): boolean =>
  [agent.version, agent.distribution, agent.links?.length].some(Boolean);

// A registry Agent not yet installed names where the page found it.
const registrySource = (agent: AgentDetail): string | undefined =>
  agent.status === 'not-installed' ? 'ACP Registry' : undefined;

// Where the Agent comes from: its registry version, how the Server installs it, and its links.
export function AboutSection(
  props: AgentDetailViewProps,
): React.JSX.Element | null {
  const { agent } = props;

  if (!hasAbout({ agent })) return null;

  return (
    <FieldSection title="About">
      <AboutRow title="Source" value={registrySource(agent)} />
      <VersionRow {...props} />
      <AboutRow title="Distribution" value={agent.distribution} />
      <AgentLinks links={agent.links} />
    </FieldSection>
  );
}

function VersionRow(props: AgentDetailViewProps): React.JSX.Element | null {
  const wide = useWide();

  if (!props.agent.version) return null;

  return (
    <ListItem
      title="Version"
      value={`v${props.agent.version}`}
      accessory={versionAccessory(props, wide)}
    />
  );
}

function AboutRow(props: {
  title: string;
  value?: string;
}): React.JSX.Element | null {
  if (!props.value) return null;

  return <ListItem title={props.title} value={props.value} />;
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
