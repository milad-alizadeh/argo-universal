import type * as React from 'react';
import { View } from 'react-native';
import { SettingsPage } from '#lib/product/settings-page';
import { Badge } from '#primitives/badge';
import { FieldGroup } from '#primitives/field-group';
import { FieldRow } from '#primitives/field-row';
import { Text } from '#primitives/text';
import type { IconSize } from '../../../lib/generic/symbols/icon';
import { useWide } from '../../../lib/generic/use-wide';
import type { AgentDetailViewProps } from '../state/agent-detail-types';
import { agentStatusLabels, statusTone } from '../state/agent-status';
import { AgentAction, RemoveAgent } from './agent-detail-actions';
import {
  AboutSection,
  AgentStatusSection,
  DefaultsSection,
} from './agent-detail-sections';
import { AgentIdentity } from './agent-identity';
import { PhoneTitle } from './phone-title';
import { RegistryIcon } from './registry-icon';

export type { AgentDetailViewProps } from '../state/agent-detail-types';

// One Agent: where it stands, the choices new Sessions start with, where it comes from, and Remove.
export function AgentDetailView(
  props: AgentDetailViewProps,
): React.JSX.Element {
  return (
    <View className="flex-1 bg-sidebar wide:bg-transparent">
      <PhoneTitle title={props.agent.name} />
      <SettingsPage title={props.agent.name} onBack={props.onBack}>
        <AgentSections {...props} />
      </SettingsPage>
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

function DetailIdentity(props: AgentDetailViewProps): React.JSX.Element {
  return (
    <AgentIdentity
      logo={<AgentIcon {...props} size="lg" />}
      description={props.agent.description ?? ''}
      trailing={<IdentityTrailing {...props} />}
    />
  );
}

// The card's one trailing slot: the status chip, or Install for a registry Agent, which has no chip.
function IdentityTrailing(
  props: AgentDetailViewProps,
): React.JSX.Element | null {
  if (statusTone(props.agent.status))
    return <AgentStatusChip agent={props.agent} />;
  return <AgentAction {...props} />;
}

function AgentIcon({
  agent,
  size,
}: AgentDetailViewProps & { size: IconSize }): React.JSX.Element {
  return <RegistryIcon uri={agent.icon} agentName={agent.name} size={size} />;
}

function AgentSections(props: AgentDetailViewProps): React.JSX.Element {
  return (
    <FieldGroup>
      <DetailIdentity {...props} />
      <PhoneSummary {...props} />
      <AgentStatusSection {...props} />
      <DefaultsSection {...props} />
      <AboutSection agent={props.agent} />
      <FieldRow>
        <RemoveAgent {...props} />
      </FieldRow>
    </FieldGroup>
  );
}

// A phone's native header shows only the name, so Paper's hero opens the page: icon tile, chip, description, action.
function PhoneSummary(props: AgentDetailViewProps): React.JSX.Element | null {
  const { agent } = props;
  if (useWide()) return null;
  return (
    <FieldRow>
      <View className="items-center gap-3">
        <PhoneIconTile {...props} />
        <AgentStatusChip agent={agent} />
        <PhoneDescription description={agent.description} />
        <AgentAction {...props} fullWidth="narrow" />
      </View>
    </FieldRow>
  );
}

function PhoneIconTile(props: AgentDetailViewProps): React.JSX.Element {
  return (
    <View className="size-16 items-center justify-center rounded-[18px] bg-muted">
      <AgentIcon {...props} size="lg" />
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
