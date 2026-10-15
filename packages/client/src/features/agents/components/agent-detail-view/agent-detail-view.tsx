import type * as React from 'react';
import { View } from 'react-native';
import { SettingsPage } from '#lib/product/settings-page';
import { Badge } from '#primitives/display/badge';
import { Text } from '#primitives/display/text';
import { GroupedList } from '#primitives/lists/grouped-list';
import { GroupedListContent } from '#primitives/lists/grouped-list-content';
import { useWide } from '../../../../lib/generic/use-wide/use-wide';
import type { AgentDetailViewProps } from '../../state/agent-detail-types';
import { installationActive } from '../../state/agent-install-phase';
import { agentStatusLabels, statusTone } from '../../state/agent-status';
import { agentIdentity } from '../agent-identity';
import { useInstallToast } from '../agent-install-control/use-install-toast';
import {
  AgentManagementFailure,
  agentEnablement,
} from '../agent-management/agent-management';
import { PhoneTitle } from '../phone-title';
import { RegistryIcon } from '../registry-icon/registry-icon';
import { AgentAction, removeAgent } from './agent-detail-actions';
import { aboutSection, agentStatusSection } from './agent-detail-sections';

export type { AgentDetailViewProps } from '../../state/agent-detail-types';

// One Agent: where it stands, where it comes from, and Remove.
export function AgentDetailView(
  props: AgentDetailViewProps,
): React.JSX.Element {
  useInstallToast(props.agent.name, props.installation);

  return (
    <View className="flex-1 bg-content wide:bg-transparent">
      <PhoneTitle title={props.agent.name} />
      <SettingsPage title={props.agent.name} onBack={props.onBack}>
        <AgentSections {...props} />
      </SettingsPage>
      <AgentManagementFailure management={props.management} />
    </View>
  );
}

// A registry Agent the Server has not installed shows no chip; its Install button says it all.
function AgentStatusChip({
  agent,
}: Pick<AgentDetailViewProps, 'agent'>): React.JSX.Element | null {
  const tone = statusTone(agent.status);

  if (!tone) return null;

  return (
    <Badge tone={tone}>
      <Text>{agentStatusLabels[agent.status]}</Text>
    </Badge>
  );
}

function detailIdentity(
  props: AgentDetailViewProps,
  wide: boolean,
): React.JSX.Element | null {
  return agentIdentity(
    {
      logo: <AgentIcon {...props} />,
      description: props.agent.description ?? '',
      trailing: <IdentityTrailing {...props} />,
    },
    wide,
  );
}

// The card's one trailing slot: the status chip, or Install for a registry Agent, which has no chip.
const showsIdentityInstallation = (props: AgentDetailViewProps): boolean =>
  props.installation?.action !== 'Update' &&
  installationActive(props.installation);

function IdentityTrailing(
  props: AgentDetailViewProps,
): React.JSX.Element | null {
  if (showsIdentityInstallation(props)) return <AgentAction {...props} />;

  if (statusTone(props.agent.status))
    return <AgentStatusChip agent={props.agent} />;

  return <AgentAction {...props} />;
}

// The logo sits beside the Agent's name, so it takes the title's size.
function AgentIcon({ agent }: AgentDetailViewProps): React.JSX.Element {
  return <RegistryIcon uri={agent.icon} agentName={agent.name} role="title" />;
}

// GroupedList takes its sections as direct children, so each one is called rather than rendered.
function AgentSections(props: AgentDetailViewProps): React.JSX.Element {
  const wide = useWide();

  return (
    <GroupedList>
      {detailIdentity(props, wide)}
      {phoneSummary(props, wide)}
      {agentStatusSection(props)}
      {agentEnablement(props.management)}
      {aboutSection(props, wide)}
      {removeAgent(props)}
    </GroupedList>
  );
}

// A phone's native header shows only the name, so Paper's hero opens the page: icon tile, chip, description, action.
function phoneSummary(
  props: AgentDetailViewProps,
  wide: boolean,
): React.JSX.Element | null {
  if (wide) return null;

  return (
    <GroupedListContent>
      <PhoneSummary {...props} />
    </GroupedListContent>
  );
}

function PhoneSummary(props: AgentDetailViewProps): React.JSX.Element {
  return (
    <View className="items-center gap-3">
      <PhoneIconTile {...props} />
      <AgentStatusChip agent={props.agent} />
      <PhoneDescription description={props.agent.description} />
      <AgentAction {...props} fullWidth="narrow" />
    </View>
  );
}

function PhoneIconTile(props: AgentDetailViewProps): React.JSX.Element {
  return (
    <View className="size-16 items-center justify-center rounded-[18px] bg-muted">
      <AgentIcon {...props} />
    </View>
  );
}

function PhoneDescription({
  description,
}: {
  description?: string;
}): React.JSX.Element | null {
  if (!description) return null;

  return (
    <Text role="secondary" className="text-center">
      {description}
    </Text>
  );
}
