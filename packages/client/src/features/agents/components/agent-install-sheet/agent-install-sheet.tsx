import type * as React from 'react';
import { View } from 'react-native';
import { Button } from '../../../../lib/generic/primitives/buttons/button/button';
import { Text } from '../../../../lib/generic/primitives/display/text/text';
import { BottomSheet } from '../../../../lib/generic/primitives/overlays/bottom-sheet/bottom-sheet';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '../../../../lib/generic/primitives/overlays/popover/popover';
import { useWide } from '../../../../lib/generic/use-wide/use-wide';
import type { AgentInstallSheetProps } from '../../state/agent-install-types';
const completedVerb = (action: AgentInstallSheetProps['action']): string =>
  action === 'Update' ? 'updated' : 'installed';
const installTitle = (props: AgentInstallSheetProps): string =>
  props.phase === 'installed'
    ? `${props.name} ${completedVerb(props.action)}`
    : `${props.action ?? 'Install'} ${props.name}?`;
function InstallTrigger(props: AgentInstallSheetProps): React.JSX.Element {
  return (
    <Button
      size="sm"
      label={props.action ?? 'Install'}
      fullWidth="narrow"
      loading={props.phase === 'installing'}
      onPress={() => props.onOpenChange(true)}
    />
  );
}
export function AgentInstallSheet(
  props: AgentInstallSheetProps,
): React.JSX.Element {
  return useWide() ? (
    <InstallPopover {...props} />
  ) : (
    <InstallBottomSheet {...props} />
  );
}
function InstallBottomSheet(props: AgentInstallSheetProps): React.JSX.Element {
  const presentation = {
    fit: true,
    open: props.open,
    label: installTitle(props),
    onOpenChange: props.onOpenChange,
    trigger: <InstallTrigger {...props} />,
  };
  return (
    <BottomSheet {...presentation}>
      <InstallSheetBody {...props} />
    </BottomSheet>
  );
}
function InstallSheetBody(props: AgentInstallSheetProps): React.JSX.Element {
  return (
    <View className="gap-3 px-4 py-4">
      <InstallContent {...props} />
    </View>
  );
}
function InstallPopover(props: AgentInstallSheetProps): React.JSX.Element {
  return (
    <Popover open={props.open} onOpenChange={props.onOpenChange}>
      <PopoverTrigger asChild>{installPopoverButton(props)}</PopoverTrigger>
      <InstallPopoverContent {...props} />
    </Popover>
  );
}
function installPopoverButton(
  props: AgentInstallSheetProps,
): React.JSX.Element {
  return (
    <Button
      appearance="content"
      size="sm"
      label={props.action ?? 'Install'}
      loading={props.phase === 'installing'}
    />
  );
}
function InstallPopoverContent(
  props: AgentInstallSheetProps,
): React.JSX.Element {
  return (
    <PopoverContent
      accessibilityLabel={installTitle(props)}
      align="start"
      className="w-80 gap-3 rounded-surface border-0 dark:border"
    >
      <InstallContent {...props} />
    </PopoverContent>
  );
}
function InstallContent(props: AgentInstallSheetProps): React.JSX.Element {
  return (
    <>
      <Text role="heading" aria-level={2}>
        {installTitle(props)}
      </Text>
      <Text>{installDescription(props)}</Text>
      <View className="gap-2 wide:flex-row wide:items-center">
        <InstallAction {...props} />
        <InstallCancel {...props} />
      </View>
    </>
  );
}
function InstallCancel(
  props: AgentInstallSheetProps,
): React.JSX.Element | null {
  if (props.phase !== 'installing') return null;
  return (
    <Button
      fullWidth="narrow"
      label="Cancel"
      variant="ghost"
      loading={props.cancelling}
      onPress={props.onCancel}
    />
  );
}
function InstallAction(props: AgentInstallSheetProps): React.JSX.Element {
  if (props.phase === 'installed')
    return <DoneInstalling onClose={() => props.onOpenChange(false)} />;
  return (
    <Button
      fullWidth="narrow"
      label={props.action ?? 'Install'}
      loading={props.phase === 'installing'}
      onPress={props.onInstall}
    />
  );
}
function DoneInstalling({
  onClose,
}: {
  onClose: () => void;
}): React.JSX.Element {
  return <Button label="Done" fullWidth="narrow" onPress={onClose} />;
}
function installDescription(props: AgentInstallSheetProps): string {
  if (props.phase === 'installing')
    return `Downloading and checking version ${props.version}. Closing this sheet keeps the Server operation running. Installation does not sign you in.`;
  if (props.phase === 'installed')
    return `Version ${props.version} is installed. Sign-in readiness is checked separately. Installation alone does not mean ready.`;
  return `Version ${props.version} · ${props.distribution} distribution. Downloads and installs on the connected Server. Sign-in is checked separately.`;
}
