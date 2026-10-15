import type { CustomAgentDefinition } from '@repo/contracts';
import type * as React from 'react';
import { useState } from 'react';
import { View } from 'react-native';
import { SettingsPage } from '#lib/product/settings-page';
import { Icon } from '#primitives/display/icon';
import { GroupedList } from '#primitives/lists/grouped-list';
import { GroupedListContent } from '#primitives/lists/grouped-list-content';
import { useWide } from '../../../../lib/generic/use-wide/use-wide';
import type { SubmitCustomAgent } from '../../hooks/use-custom-agent-form';
import { customAgentDescription } from '../../state/agent-list';
import type { AgentManagement } from '../../state/agent-management-types';
import { agentIdentity } from '../agent-identity';
import {
  AgentManagementFailure,
  agentEnablement,
} from '../agent-management/agent-management';
import { AgentRemoval } from '../agent-management/agent-removal';
import { AgentPlaceholder } from '../agent-placeholder';
import { CustomAgentForm } from '../custom-agent-form/custom-agent-form';
import { launchSections } from '../custom-agent-launch';
import { PhoneTitle } from '../phone-title';
import type { CustomAgentCheck } from './custom-agent-status';
import { ReadinessChip, readinessSection } from './custom-agent-status';

export type CustomAgentDetailViewProps = {
  agentId: string;
  // Absent until the Server lists the Agent as custom; other Agents get a placeholder.
  definition: CustomAgentDefinition | undefined;
  // Absent while the Server checks the program again.
  check: CustomAgentCheck;
  onCheck: () => void;
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
    <View className="flex-1 bg-content wide:bg-transparent">
      <PhoneTitle title={props.definition.name} />
      <SettingsPage title={props.definition.name} onBack={props.onBack}>
        <CustomAgentContent {...props} />
      </SettingsPage>
      <AgentManagementFailure management={props.management} />
    </View>
  );
}

// The generic Agent glyph stands in for the logo a custom Agent lacks.
function customAgentIdentity(
  check: SettingsProps['check'],
  wide: boolean,
): React.JSX.Element | null {
  return agentIdentity(
    {
      logo: <Icon name="agent" role="title" className="text-foreground" />,
      description: customAgentDescription,
      trailing: <ReadinessChip check={check} />,
    },
    wide,
  );
}

// The identity card and the Status, then the launch values; Edit turns the values into the form, under the same Status.
function CustomAgentContent(props: SettingsProps): React.JSX.Element {
  const [editing, onEditing] = useState(false);
  const wide = useWide();

  // GroupedList takes its sections as direct children, so each one is called rather than rendered.
  const status = [
    customAgentIdentity(props.check, wide),
    readinessSection({
      check: props.check,
      onCheck: props.onCheck,
      onSignIn: props.onSignIn,
    }),
  ];

  const content = { ...props, status, onEditing };

  return editing ? <LaunchForm {...content} /> : <LaunchView {...content} />;
}

function LaunchView(props: ContentProps): React.JSX.Element {
  return (
    <GroupedList>
      {props.status}
      {launchSections({
        definition: props.definition,
        onEdit: () => props.onEditing(true),
      })}
      {agentEnablement(props.management)}
      {customRemoval(props)}
    </GroupedList>
  );
}

function customRemoval(props: SettingsProps): React.JSX.Element | null {
  if (!props.management) return null;

  return (
    <GroupedListContent key="remove">
      <AgentRemoval
        name={props.definition.name}
        custom
        onRemove={props.management.onRemove}
        busy={props.management.busy}
      />
    </GroupedListContent>
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
