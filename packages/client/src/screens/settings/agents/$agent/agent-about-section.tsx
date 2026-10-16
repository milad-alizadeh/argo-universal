import type * as React from 'react';
import {
  type AgentDetail,
  type AgentDetailViewProps,
  installationActive,
} from '#features/agents';
import { GroupedListItem } from '#primitives/lists/grouped-list-item';
import { GroupedListSection } from '#primitives/lists/grouped-list-section';
import { SizeClass } from '../../../../lib/generic/size-class/size-class';
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
    <GroupedListSection title="About">
      <AboutRow title="Source" value={registrySource(agent)} />
      <VersionRow {...props} />
      <AboutRow title="Distribution" value={agent.distribution} />
      <AgentLinks links={agent.links} />
    </GroupedListSection>
  );
}

// Wide, the row also offers the update the phone's summary shows.
function VersionRow(props: AgentDetailViewProps): React.JSX.Element | null {
  if (!props.agent.version) return null;

  return (
    <>
      <SizeClass only="wide">
        <VersionItem {...props} wide />
      </SizeClass>
      <SizeClass only="compact">
        <VersionItem {...props} wide={false} />
      </SizeClass>
    </>
  );
}

function VersionItem({
  wide,
  ...props
}: AgentDetailViewProps & { wide: boolean }): React.JSX.Element {
  return (
    <GroupedListItem
      label="Version"
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

  return <GroupedListItem label={props.title} value={props.value} />;
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
