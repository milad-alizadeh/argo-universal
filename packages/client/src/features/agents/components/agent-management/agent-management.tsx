import type * as React from 'react';
import { Switch } from '#primitives/inputs/switch';
import { GroupedListItem } from '#primitives/lists/grouped-list-item';
import { GroupedListSection } from '#primitives/lists/grouped-list-section';
import { Alert } from '#primitives/overlays/alert';
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
    <GroupedListSection
      title="Availability"
      footer="Disabled Agents cannot start new Sessions. Open Sessions keep working."
    >
      <GroupedListItem
        label="Enabled"
        accessory={<EnablementSwitch management={management} />}
      />
    </GroupedListSection>
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
      value={management.enabled}
      disabled={management.busy}
      onValueChange={management.onEnabledChange}
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
  { label: 'Close', cancel: true },
  ...(inUse ? [] : [{ label: 'Try again', onPress: management.onRemove }]),
];
