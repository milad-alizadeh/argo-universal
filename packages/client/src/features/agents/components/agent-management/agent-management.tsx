import type * as React from 'react';
import { FieldSection } from '#primitives/fields/field-section/field-section-view';
import { Switch } from '#primitives/inputs/switch/switch-view';
import { ListItem } from '#primitives/lists/list-item/list-item-view';
import { Alert } from '#primitives/overlays/alert/alert';
import type { AgentManagement } from '../../state/agent-management-types';

type ManagementProps = { management?: AgentManagement };

export function AgentEnablement({
  management,
}: ManagementProps): React.JSX.Element | null {
  return management ? <EnablementSection management={management} /> : null;
}

type EnabledProps = { management: AgentManagement };

function EnablementSection({ management }: EnabledProps): React.JSX.Element {
  return (
    <FieldSection
      title="Availability"
      footer="Disabled Agents cannot start new Sessions. Open Sessions keep working."
    >
      <ListItem
        title="Enabled"
        accessory={<EnablementSwitch management={management} />}
      />
    </FieldSection>
  );
}

function EnablementSwitch({
  management,
}: {
  management: AgentManagement;
}): React.JSX.Element {
  return (
    <Switch
      accessibilityLabel="Agent enabled"
      checked={management.enabled}
      disabled={management.busy}
      onCheckedChange={management.onEnabledChange}
    />
  );
}

const failureContent = (
  management: AgentManagement,
): Pick<
  React.ComponentProps<typeof Alert>,
  'title' | 'message' | 'actions'
> => {
  const inUse = isInUseFailure(management.failure);

  return {
    title: inUse ? 'Agent is in use' : 'Removal failed',
    message: management.failure,
    actions: failureActions(management, inUse),
  };
};

export function AgentManagementFailure({
  management,
}: ManagementProps): React.JSX.Element | null {
  if (!management) return null;

  return (
    <Alert
      open={!!management.failure}
      onOpenChange={management.onDismissFailure}
      {...failureContent(management)}
    />
  );
}

const isInUseFailure = (failure?: string): boolean =>
  failure?.includes('in use') ?? false;

const failureActions = (
  management: AgentManagement,
  inUse: boolean,
): React.ComponentProps<typeof Alert>['actions'] => [
  { label: 'Close', role: 'cancel' },
  ...(inUse ? [] : [{ label: 'Try again', onPress: management.onRemove }]),
];
