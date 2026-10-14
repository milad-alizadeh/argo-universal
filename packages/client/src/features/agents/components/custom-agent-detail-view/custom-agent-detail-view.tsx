import type { CustomAgentDefinition } from '@repo/contracts';
import type * as React from 'react';
import { useState } from 'react';
import { View } from 'react-native';
import { FieldGroup } from '#lib/generic/primitives/fields/field-group/field-group';
import { SettingsPage } from '#lib/product/settings-page';
import { Icon } from '../../../../lib/generic/symbols/icon';
import type { SubmitCustomAgent } from '../../hooks/use-custom-agent-form';
import { customAgentDescription } from '../../state/agent-list';
import type { AgentManagement } from '../../state/agent-management-types';
import { AgentIdentity } from '../agent-identity';
import {
  AgentEnablement,
  AgentManagementFailure,
} from '../agent-management/agent-management';
import { AgentRemoval } from '../agent-management/agent-removal';
import { AgentPlaceholder } from '../agent-placeholder';
import { AgentStatusChip } from '../agent-readiness/agent-readiness';
import { CustomAgentForm } from '../custom-agent-form/custom-agent-form';
import { LaunchSections } from '../custom-agent-launch';
import { PhoneTitle } from '../phone-title';
import {
  type CustomAgentReadiness,
  CustomReadinessSection,
} from './custom-agent-status';

export type CustomAgentDetailViewProps = {
  agentId: string;
  // Absent until the Server lists the Agent as custom; other Agents get a placeholder.
  definition: CustomAgentDefinition | undefined;
  readiness: CustomAgentReadiness;
  // Absent while a Recheck runs.
  onRecheck?: () => void;
  onSave: SubmitCustomAgent;
  onBack?: () => void;
  onSignIn?: () => void;
  management?: AgentManagement;
};

type SettingsProps = Omit<
  CustomAgentDetailViewProps,
  'agentId' | 'definition'
> & {
  definition: CustomAgentDefinition;
};

// The page below its header: the Status, and the launch values or their form.
type ContentProps = SettingsProps & {
  status: React.ReactNode;
  onEditing: (editing: boolean) => void;
};

export function CustomAgentDetailView({
  agentId,
  definition,
  ...settings
}: CustomAgentDetailViewProps): React.JSX.Element {
  if (!definition) return <AgentPlaceholder agent={agentId} />;

  return <CustomAgentSettings definition={definition} {...settings} />;
}

function CustomAgentSettings(props: SettingsProps): React.JSX.Element {
  return (
    <View className="flex-1 bg-sidebar wide:bg-transparent">
      <PhoneTitle title={props.definition.name} />
      <SettingsPage title={props.definition.name} onBack={props.onBack}>
        <CustomAgentContent {...props} />
      </SettingsPage>
      <AgentManagementFailure management={props.management} />
    </View>
  );
}

// The generic Agent glyph stands in for the logo a custom Agent lacks.
function CustomAgentIdentity({
  readiness,
}: Pick<SettingsProps, 'readiness'>): React.JSX.Element {
  return (
    <AgentIdentity
      logo={<Icon name="agent" role="title" className="text-foreground" />}
      description={customAgentDescription}
      trailing={<AgentStatusChip status={readiness.status} />}
    />
  );
}

// The identity card and the Status, then the launch values; Edit turns the values into the form, under the same Status.
function CustomAgentContent(props: SettingsProps): React.JSX.Element {
  const [editing, onEditing] = useState(false);

  // A list rather than a fragment, so a native group still sees each section.
  const status = [
    <CustomAgentIdentity key="identity" readiness={props.readiness} />,
    <CustomReadinessSection
      key="status"
      name={props.definition.name}
      readiness={props.readiness}
      onRecheck={props.onRecheck}
      onSignIn={props.onSignIn}
    />,
  ];

  const content = { ...props, status, onEditing };

  return editing ? <LaunchForm {...content} /> : <LaunchView {...content} />;
}

function LaunchView(props: ContentProps): React.JSX.Element {
  return (
    <FieldGroup>
      {props.status}
      <LaunchSections
        definition={props.definition}
        onEdit={() => props.onEditing(true)}
      />
      <AgentEnablement management={props.management} />
      <CustomRemoval {...props} />
    </FieldGroup>
  );
}

function CustomRemoval(props: SettingsProps): React.JSX.Element | null {
  if (!props.management) return null;

  return (
    <AgentRemoval
      name={props.definition.name}
      custom
      onRemove={props.management.onRemove}
      busy={props.management.busy}
    />
  );
}

// The read-only values return once the edited program passes its check.
const closeWhenSaved =
  ({
    onSave,
    onClose,
  }: Pick<SettingsProps, 'onSave'> & {
    onClose: () => void;
  }): SubmitCustomAgent =>
  async (edited) => {
    const result = await onSave(edited);

    if (result.status === 'ready') onClose();

    return result;
  };

function LaunchForm(props: ContentProps): React.JSX.Element {
  const onClose = (): void => props.onEditing(false);

  return (
    <CustomAgentForm
      initial={props.definition}
      submitLabel="Save"
      onSubmit={closeWhenSaved({ onSave: props.onSave, onClose })}
      onCancel={onClose}
      leading={props.status}
    />
  );
}
