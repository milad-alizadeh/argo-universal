import type { InstallationOwner } from '@repo/contracts';
import { setStringAsync } from 'expo-clipboard';
import type * as React from 'react';
import { useState } from 'react';
import { View } from 'react-native';
import { Button } from '#lib/generic/primitives/buttons/button/button';
import { Text } from '#lib/generic/primitives/display/text/text';
import type { ButtonProps } from '../../../../lib/generic/primitives/buttons/button/button-props';
import {
  Alert,
  type AlertAction,
} from '../../../../lib/generic/primitives/overlays/alert/alert';
import type { AgentDetail } from '../../state/agent-detail-types';
import type { AgentManagement } from '../../state/agent-management-types';

const ownerNames: Partial<Record<InstallationOwner, string>> = {
  homebrew: 'Homebrew',
  npm: 'npm',
};

// A copy Argo did not install: Argo neither updates nor removes it.
export const isOutsideCopy = ({ owner }: Pick<AgentDetail, 'owner'>): boolean =>
  !!owner && owner !== 'argo';

const ownerName = ({ owner = 'unknown' }: AgentDetail): string =>
  ownerNames[owner] ?? 'Something other than Argo';

type DisableProps = { agent: AgentDetail; management?: AgentManagement };

// In place of Remove: Disable hides the copy from new Sessions and leaves it where its owner put it.
export function DisableOutsideCopy(props: DisableProps): React.JSX.Element {
  return (
    <View className="items-stretch gap-2 wide:items-start">
      <DisableButton {...props} />
      <Text role="secondary" className="px-4 wide:px-0">
        {`${ownerName(props.agent)} owns this copy, so Argo won’t remove it. Disable hides it from new Sessions.`}
      </Text>
    </View>
  );
}

const disabling = (management?: AgentManagement): boolean =>
  !management?.enabled || management.busy;

function DisableButton({ agent, management }: DisableProps): React.JSX.Element {
  return (
    <Button
      label={`Disable ${agent.name}`}
      size="sm"
      fullWidth="narrow"
      onPress={() => management?.onEnabledChange(false)}
      disabled={disabling(management)}
    />
  );
}

type UpdateProps = { agent: AgentDetail; server?: string } & Pick<
  ButtonProps,
  'fullWidth'
>;

// Update on a copy Argo did not install opens the Alert; nothing runs.
export function UpdateOutsideCopy(props: UpdateProps): React.JSX.Element {
  const [open, onOpenChange] = useState(false);

  return (
    <>
      <Button
        size="sm"
        fullWidth={props.fullWidth}
        label="Update"
        onPress={() => onOpenChange(true)}
      />
      <UpdateYourself {...props} open={open} onOpenChange={onOpenChange} />
    </>
  );
}

type AlertProps = UpdateProps & {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function UpdateYourself(props: AlertProps): React.JSX.Element {
  const { agent } = props;

  return (
    <Alert
      open={props.open}
      onOpenChange={props.onOpenChange}
      title={`Update ${agent.name} yourself`}
      message={updateMessage(props)}
      command={agent.updateCommand}
      actions={updateActions(agent.updateCommand)}
    />
  );
}

const serverName = (server = 'the connected Server'): string => server;

// Nothing says what installed the copy, so the Alert names the release and where the copy is.
const unknownOwnerMessage = ({ agent, server }: UpdateProps): string =>
  `Argo didn’t install ${agent.name} and can’t tell what did. Update the copy at ${agent.path ?? 'its path'} to v${agent.availableVersion ?? ''} on ${serverName(server)}.`;

const updateMessage = (props: UpdateProps): string =>
  props.agent.updateCommand
    ? `${ownerName(props.agent)} installed ${props.agent.name}, so Argo won’t update it. Run this on ${serverName(props.server)}:`
    : unknownOwnerMessage(props);

const copyAction = (command: string): AlertAction => ({
  label: 'Copy command',
  onPress: () => void setStringAsync(command),
});

const updateActions = (command?: string): readonly AlertAction[] => [
  { label: 'Close', role: 'cancel' },
  ...(command ? [copyAction(command)] : []),
];
