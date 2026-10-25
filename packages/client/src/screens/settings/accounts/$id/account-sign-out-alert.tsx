import { Alert, type AlertAction } from '@repo/kit/primitives/overlays/alert';
import type * as React from 'react';

export interface AccountSignOutAlertProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account: {
    // The name of the Plugin that signed the Account in.
    provider: string;
    // The other Plugins that borrow it.
    borrowers: { name: string }[];
  };
  onSignOut: () => void;
}

export const signOutCopy = {
  title: 'Sign out of this Account?',
  signOut: 'Sign out',
  cancel: 'Cancel',
};

// The native Alert before a sign-out, naming the providing Plugin first and then every Plugin that loses access.
export const AccountSignOutAlert = (
  props: AccountSignOutAlertProps,
): React.JSX.Element => (
  <Alert
    open={props.open}
    onOpenChange={props.onOpenChange}
    title={signOutCopy.title}
    message={signOutMessage(props.account)}
    actions={signOutActions(props.onSignOut)}
  />
);

function signOutMessage({
  provider,
  borrowers,
}: AccountSignOutAlertProps['account']): string {
  const names = joinNames([provider, ...borrowers.map((b) => b.name)]);

  return `${provider} provides this Account. ${names} will lose access.`;
}

function joinNames(names: string[]): string {
  if (names.length < 2) return names.join('');

  return `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`;
}

const signOutActions = (onSignOut: () => void): AlertAction[] => [
  { label: signOutCopy.cancel, role: 'cancel' },
  { label: signOutCopy.signOut, tone: 'danger', onPress: onSignOut },
];
