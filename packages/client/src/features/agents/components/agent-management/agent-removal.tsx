import type * as React from 'react';
import { useState } from 'react';
import { View } from 'react-native';
import { Button } from '#lib/generic/primitives/buttons/button/button';
import { Text } from '#lib/generic/primitives/display/text/text';
import { Alert } from '../../../../lib/generic/primitives/overlays/alert/alert';
import { useWide } from '../../../../lib/generic/use-wide/use-wide';

export interface AgentRemovalProps {
  name: string;
  custom?: boolean;
  onRemove?: () => void;
  busy?: boolean;
}

const removalMessage = ({ name, custom }: AgentRemovalProps): string =>
  custom
    ? 'Removes this Agent from your configured choices. Its external program and credentials stay untouched. Past Sessions keep their history.'
    : `Uninstalls ${name} from this Server. Past Sessions keep their history. Sign-in credentials stay with ${name}.`;

export function AgentRemoval(props: AgentRemovalProps): React.JSX.Element {
  const [open, onOpenChange] = useState(false);

  return (
    <View className="items-stretch gap-2 wide:items-start">
      <RemovalButton {...props} onOpen={() => onOpenChange(true)} />
      <RemovalDescription custom={props.custom} />
      <RemovalConfirmation {...props} open={open} onOpenChange={onOpenChange} />
    </View>
  );
}

function RemovalDescription({
  custom,
}: Pick<AgentRemovalProps, 'custom'>): React.JSX.Element {
  return (
    <Text role="secondary" className="px-4 wide:px-0">
      {custom
        ? 'Keeps the external program and past Sessions.'
        : 'Uninstalls it from the Server. Past Sessions keep their history.'}
    </Text>
  );
}

type RemovalConfirmationProps = AgentRemovalProps & {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function RemovalConfirmation(
  props: RemovalConfirmationProps,
): React.JSX.Element {
  return (
    <Alert
      open={props.open}
      onOpenChange={props.onOpenChange}
      title={`Remove ${props.name}?`}
      message={removalMessage(props)}
      actions={removalActions(props)}
    />
  );
}

const removalActions = (
  props: AgentRemovalProps,
): React.ComponentProps<typeof Alert>['actions'] => [
  { label: 'Cancel', role: 'cancel' },
  { label: 'Remove', role: 'destructive', onPress: props.onRemove },
];

type RemovalTriggerProps = AgentRemovalProps & { onOpen: () => void };

const removalButtonPresentation = (
  props: RemovalTriggerProps,
  wide: boolean,
): React.ComponentProps<typeof Button> => ({
  label: wide ? `Remove ${props.name}` : `Remove ${props.name} Agent`,
  size: 'sm',
  fullWidth: 'narrow',
  variant: 'outline',
  role: 'destructive',
  onPress: props.onOpen,
  disabled: !props.onRemove || props.busy,
  loading: props.busy,
});

function RemovalButton(props: RemovalTriggerProps): React.JSX.Element {
  return <Button {...removalButtonPresentation(props, useWide())} />;
}
