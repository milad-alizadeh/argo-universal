import { Button } from '@repo/kit/primitives/actions/button';
import { Text } from '@repo/kit/primitives/content/text';
import { FieldGroup } from '@repo/kit/primitives/fields/field-group';
import { Screen } from '@repo/kit/primitives/scaffolds/screen';
import type * as React from 'react';
import { useState } from 'react';
import { View } from 'react-native';
import { AccountSignOutAlert, signOutCopy } from './account-sign-out-alert';

export interface AccountBorrower {
  pluginId: string;
  name: string;
}

export type AccountDetailLoad =
  | { status: 'loading' }
  | { status: 'missing' }
  | {
      status: 'loaded';
      host: string;
      // The name of the Plugin that signed the Account in.
      provider: string;
      // The other Plugins allowed to borrow it.
      borrowers: AccountBorrower[];
      // The Plugins refused its use, which can be allowed again.
      refused: AccountBorrower[];
    };

type LoadedAccount = Extract<AccountDetailLoad, { status: 'loaded' }>;

export const accountDetailTitle = 'Account detail';

export interface AccountDetailViewProps {
  // The Account's label, or its id until the Account loads; it heads the Account's first section.
  title: string;
  caption?: string;
  account: AccountDetailLoad;
  onRevoke: (pluginId: string) => void;
  onAllow: (pluginId: string) => void;
  onSignOut: () => void;
  onBack?: () => void;
}

// One Account: where it signs in, who provides it, which other Plugins may borrow it, and Sign out.
export function AccountDetailView(
  props: AccountDetailViewProps,
): React.JSX.Element {
  const [open, onOpenChange] = useState(false);

  return (
    <Screen
      title={accountDetailTitle}
      caption={props.caption}
      onBack={props.onBack}
    >
      {accountBody(props, open, onOpenChange)}
    </Screen>
  );
}

function accountBody(
  props: AccountDetailViewProps,
  open: boolean,
  onOpenChange: (open: boolean) => void,
): React.ReactNode {
  const { account } = props;

  if (account.status === 'loading') return oneRow('Loading the Account…');

  if (account.status === 'missing')
    return oneRow(`The Server has no Account named ${props.title}.`);

  return loadedAccountBody(props, account, open, onOpenChange);
}

// While loading, or when the Account is gone, the page is one row saying so.
const oneRow = (title: string): React.JSX.Element => (
  <FieldGroup>
    <FieldGroup.Section>
      <FieldGroup.Value title={title} value="" />
    </FieldGroup.Section>
  </FieldGroup>
);

type LoadedProps = AccountDetailViewProps & { account: LoadedAccount };

function loadedAccountBody(
  props: AccountDetailViewProps,
  account: LoadedAccount,
  open: boolean,
  onOpenChange: (open: boolean) => void,
): React.ReactNode {
  const { onSignOut } = props;

  return (
    <View className="gap-2">
      <FieldGroup>{accountSections({ ...props, account })}</FieldGroup>
      {signOutSection(account, () => onOpenChange(true))}
      <AccountSignOutAlert {...{ account, onSignOut, open, onOpenChange }} />
    </View>
  );
}

const accountSections = (props: LoadedProps): React.JSX.Element => (
  <>
    {detailsSection(props.title, props.account)}
    {accessSection(props)}
  </>
);

// FieldGroup finds its sections by element type, so each is an element built here, not a component.
const detailsSection = (
  title: string,
  account: LoadedAccount,
): React.JSX.Element => (
  <FieldGroup.Section title={title}>
    <FieldGroup.Value title="Host" value={account.host} />
    <FieldGroup.Value title="Provided by" value={account.provider} />
  </FieldGroup.Section>
);

const accessFooter =
  'A Plugin turned off can no longer borrow this Account. Turn it on to allow it again.';

// One switch per other Plugin: on while it may borrow the Account, off once refused.
const accessSection = (props: LoadedProps): React.JSX.Element => (
  <FieldGroup.Section title="Plugins using this Account" footer={accessFooter}>
    {accessRows(props)}
  </FieldGroup.Section>
);

interface PluginAccess {
  plugin: AccountBorrower;
  allowed: boolean;
}

// By name, so a Plugin keeps its row when its switch flips.
const pluginAccess = (account: LoadedAccount): PluginAccess[] =>
  [
    ...account.borrowers.map((plugin) => ({ plugin, allowed: true })),
    ...account.refused.map((plugin) => ({ plugin, allowed: false })),
  ].sort((a, b) => a.plugin.name.localeCompare(b.plugin.name));

function accessRows(
  props: LoadedProps,
): React.JSX.Element | React.JSX.Element[] {
  const plugins = pluginAccess(props.account);

  if (plugins.length === 0) return noOtherPlugins;

  return plugins.map((access) => accessRow(access, props));
}

const accessRow = (
  { plugin, allowed }: PluginAccess,
  { onAllow, onRevoke }: LoadedProps,
): React.JSX.Element => (
  <FieldGroup.Toggle
    key={plugin.pluginId}
    title={plugin.name}
    value={allowed}
    onValueChange={(on) => (on ? onAllow : onRevoke)(plugin.pluginId)}
  />
);

const noOtherPlugins = (
  <FieldGroup.Value title="No other Plugins use this Account." value="" />
);

const signOutSection = (
  account: LoadedAccount,
  onPress: () => void,
): React.JSX.Element => (
  <View className="gap-2">
    <Button
      label={signOutCopy.signOut}
      variant="danger"
      onPress={onPress}
      fullWidth
    />
    <Text role="secondary" tone="muted">
      Sign out also removes access for {account.provider} and every Plugin using
      this Account.
    </Text>
  </View>
);
