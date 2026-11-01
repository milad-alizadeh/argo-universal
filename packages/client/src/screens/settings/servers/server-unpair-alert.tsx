import { Alert, type AlertAction } from '@repo/kit/primitives/overlays/alert';
import type * as React from 'react';
import { useState } from 'react';
import type { ServerRow } from './server-rows';

export interface ServerUnpairAlertProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  name: string;
  state: ServerRow['state'];
  onUnpair: () => void;
}

export const serverUnpairCopy = { action: 'Unpair', cancel: 'Cancel' };

/*
 * What the owner loses, and how to get it back, with no Undo: pairing again needs a new code from the computer.
 * A Server that cannot be reached is told apart, because unpairing then only removes it here and it keeps listing this phone until it is removed there.
 */
export const serverUnpairMessage = (
  name: string,
  state: ServerRow['state'],
): string => {
  if (state === 'not-allowed')
    return `${name} no longer knows this phone. Unpairing removes it from this list.`;

  if (state === 'unreachable')
    return `${name} can’t be reached right now, so it will keep listing this phone until you remove it there. This phone loses access either way.`;

  return 'This phone loses access straight away. To use it again you’ll need to scan a new code.';
};

export const ServerUnpairAlert = (
  props: ServerUnpairAlertProps,
): React.JSX.Element => (
  <Alert
    open={props.open}
    onOpenChange={props.onOpenChange}
    title={`Unpair “${props.name}”?`}
    message={serverUnpairMessage(props.name, props.state)}
    actions={actions(props.onUnpair)}
  />
);

const actions = (onUnpair: () => void): AlertAction[] => [
  { label: serverUnpairCopy.cancel, role: 'cancel' },
  { label: serverUnpairCopy.action, tone: 'danger', onPress: onUnpair },
];

// The question and the press that opens it, so a page keeps one handle and one element.
export function useUnpairAsk(
  server: Pick<ServerUnpairAlertProps, 'name' | 'state'>,
  onUnpair: () => void,
): readonly [() => void, React.JSX.Element] {
  const [open, onOpenChange] = useState(false);

  const alert = (
    <ServerUnpairAlert
      {...server}
      open={open}
      onOpenChange={onOpenChange}
      onUnpair={onUnpair}
    />
  );

  return [() => onOpenChange(true), alert];
}
