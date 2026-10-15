import type * as React from 'react';
import { Switch } from '#primitives/inputs/switch';
import { GroupedListItem } from '#primitives/lists/grouped-list-item';
import { GroupedListSection } from '#primitives/lists/grouped-list-section';
import { Alert } from '#primitives/overlays/alert';
import type { AgentManagement } from '../../state/agent-management-types';

type ManagementProps = { management?: AgentManagement };

// GroupedList takes its sections, and each section its rows, as direct children, so this is called rather than rendered.
const availability = {
  title: 'Availability',
  footer:
    'Disabled Agents cannot start new Sessions. Open Sessions keep working.',
};

export function agentEnablement(
  management: AgentManagement | undefined,
): React.JSX.Element | null {
  if (!management) return null;

  return (
    <GroupedListSection {...availability}>
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
