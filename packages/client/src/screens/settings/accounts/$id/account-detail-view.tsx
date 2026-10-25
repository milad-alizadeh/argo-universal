import { Button } from '@repo/kit/primitives/actions/button';
import { FieldGroup } from '@repo/kit/primitives/fields/field-group';
import { Screen } from '@repo/kit/primitives/scaffolds/screen';
import type * as React from 'react';
import { useState } from 'react';
import { SettingsLoading } from '../../settings-loading';
import { refusedSections } from './account-refused-sections';
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

// One Account: where it signs in, who provides it, who borrows it, who was refused, and Sign out.
export function AccountDetailView(
  props: AccountDetailViewProps,
): React.JSX.Element {
  return (
    <Screen
      title={accountDetailTitle}
      caption={props.caption}
      onBack={props.onBack}
    >
      <AccountBody {...props} />
    </Screen>
  );
}

function AccountBody(props: AccountDetailViewProps): React.JSX.Element {
  const { account } = props;

  if (account.status === 'loading')
    return <SettingsLoading label="Loading the Account…" />;

  if (account.status === 'missing') return missingAccount(props.title);

  return <LoadedAccountBody {...props} account={account} />;
}

const missingAccount = (title: string): React.JSX.Element => (
  <FieldGroup>
    <FieldGroup.Section>
      <FieldGroup.Value
        title={`The Server has no Account named ${title}.`}
        value=""
      />
    </FieldGroup.Section>
  </FieldGroup>
);

type LoadedProps = AccountDetailViewProps & { account: LoadedAccount };

function LoadedAccountBody(props: LoadedProps): React.JSX.Element {
  const [open, onOpenChange] = useState(false);
  const { account, onSignOut } = props;

  return (
    <>
      <FieldGroup>
        {accountSections(props, () => onOpenChange(true))}
      </FieldGroup>
      <AccountSignOutAlert {...{ account, onSignOut, open, onOpenChange }} />
    </>
  );
}

const accountSections = (
  props: LoadedProps,
  onSignOutPress: () => void,
): React.JSX.Element => (
  <>
    {detailsSection(props.title, props.account)}
    {borrowerSections(props.account, props.onRevoke)}
    {refusedSections(props.account.refused, props.onAllow)}
    {signOutSection(props.account, onSignOutPress)}
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

const borrowersTitle = 'Plugins using this Account';

const emptyBorrowers = (
  <FieldGroup.Section title={borrowersTitle}>
    <FieldGroup.Value title="No other Plugins use this Account." value="" />
  </FieldGroup.Section>
);

// One section per Plugin, so each Revoke access sits under the Plugin it ends.
function borrowerSections(
  account: LoadedAccount,
  onRevoke: AccountDetailViewProps['onRevoke'],
): React.JSX.Element | React.JSX.Element[] {
  if (account.borrowers.length === 0) return emptyBorrowers;

  return account.borrowers.map((borrower, index) =>
    borrowerSection({
      borrower,
      host: account.host,
      first: index === 0,
      onRevoke,
    }),
  );
}

interface BorrowerSectionProps {
  borrower: AccountBorrower;
  host: string;
  first: boolean;
  onRevoke: AccountDetailViewProps['onRevoke'];
}

const usesHost = (props: BorrowerSectionProps): string => `Uses ${props.host}`;

const borrowerSection = (props: BorrowerSectionProps): React.JSX.Element => (
  <FieldGroup.Section
    key={props.borrower.pluginId}
    title={props.first ? borrowersTitle : undefined}
  >
    <FieldGroup.Value title={props.borrower.name} value={usesHost(props)} />
    {revokeButton(() => props.onRevoke(props.borrower.pluginId))}
  </FieldGroup.Section>
);

const revokeButton = (onPress: () => void): React.JSX.Element => (
  <Button label="Revoke access" variant="secondary" onPress={onPress} />
);

const signOutSection = (
  account: LoadedAccount,
  onPress: () => void,
): React.JSX.Element => (
  <FieldGroup.Section
    footer={`Sign out also removes access for ${account.provider} and every Plugin using this Account.`}
  >
    <Button label={signOutCopy.signOut} variant="danger" onPress={onPress} />
  </FieldGroup.Section>
);
