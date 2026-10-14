import type * as React from 'react';
import { View } from 'react-native';
import { Text } from '#lib/generic/primitives/display/text/text';
import { FieldGroup } from '#lib/generic/primitives/fields/field-group/field-group';
import { FieldRow } from '#lib/generic/primitives/fields/field-row/field-row';
import { SettingsPage } from '#lib/product/settings-page';
import { useWide } from '../../../../lib/generic/use-wide/use-wide';
import type { AgentDetailViewProps } from '../../state/agent-detail-types';
import { AgentIdentity } from '../agent-identity';
import { useInstallToast } from '../agent-install-control/use-install-toast';
import {
  AgentEnablement,
  AgentManagementFailure,
} from '../agent-management/agent-management';
import { useToolToast } from '../agent-missing-tool/tool-toast';
import { PhoneTitle } from '../phone-title';
import { RegistryIcon } from '../registry-icon/registry-icon';
import { RemoveAgent } from './agent-detail-actions';
import { AboutSection, AgentStatusSection } from './agent-detail-sections';

export type { AgentDetailViewProps } from '../../state/agent-detail-types';

// One Agent: where it stands, where it comes from, and Remove.
export function AgentDetailView(
  props: AgentDetailViewProps,
): React.JSX.Element {
  useInstallToast(props.agent.name, props.installation);
  useToolToast(props.agent.name, props.tool);

  return (
    <View className="flex-1 bg-sidebar wide:bg-transparent">
      <PhoneTitle title={props.agent.name} />
      <SettingsPage title={props.agent.name} onBack={props.onBack}>
        <AgentSections {...props} />
      </SettingsPage>
      <AgentManagementFailure management={props.management} />
    </View>
  );
}

function DetailIdentity(props: AgentDetailViewProps): React.JSX.Element {
  return (
    <AgentIdentity
      logo={<AgentIcon {...props} />}
      description={props.agent.description ?? ''}
    />
  );
}

// The logo sits beside the Agent's name, so it takes the title's size.
function AgentIcon({ agent }: AgentDetailViewProps): React.JSX.Element {
  return <RegistryIcon uri={agent.icon} agentName={agent.name} role="title" />;
}

function AgentSections(props: AgentDetailViewProps): React.JSX.Element {
  return (
    <FieldGroup>
      <DetailIdentity {...props} />
      <PhoneSummary {...props} />
      <AgentStatusSection {...props} />
      <AgentEnablement management={props.management} />
      <AboutSection {...props} />
      <FieldRow>
        <RemoveAgent {...props} />
      </FieldRow>
    </FieldGroup>
  );
}

// A phone's native header shows only the name, so Paper's hero opens the page: icon tile and description; the Status section follows.
function PhoneSummary(props: AgentDetailViewProps): React.JSX.Element | null {
  if (useWide()) return null;

  return (
    <FieldRow>
      <View className="items-center gap-3">
        <PhoneIconTile {...props} />
        <PhoneDescription description={props.agent.description} />
      </View>
    </FieldRow>
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
