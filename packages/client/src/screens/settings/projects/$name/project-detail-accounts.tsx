import { FieldGroup } from '@repo/kit/primitives/fields/field-group';
import type * as React from 'react';

interface ProjectAccountChoice {
  id: string;
  label: string;
  // The Plugin that signed the Account in, named under its label.
  provider: string;
}

export interface ProjectAccountHost {
  host: string;
  accounts: ProjectAccountChoice[];
  // The Account this Project chose for the host; undefined until it chooses one.
  chosen?: string;
}

export interface ProjectAccountsProps {
  // One entry per host that has an Account on the Server.
  hosts: ProjectAccountHost[];
  onChooseAccount: (host: string, accountId: string) => void;
}

const unchosenSummary = 'Choose Account';

const footer = 'Used by every Plugin in this Project.';

// FieldGroup finds its sections by element type, so this is an element built here, not a component.
const sectionOf = (accounts: ProjectAccountsProps): React.JSX.Element => (
  <FieldGroup.Section title="Accounts" footer={footer}>
    {accounts.hosts.map((entry) => hostRow(entry, accounts.onChooseAccount))}
  </FieldGroup.Section>
);

// One row per host, each choosing the Account every Plugin in the Project borrows for it; none when no host has an Account.
export const accountsSection = (
  accounts: ProjectAccountsProps | undefined,
): React.JSX.Element | null =>
  accounts && accounts.hosts.length > 0 ? sectionOf(accounts) : null;

type PickerOption = React.ComponentProps<
  typeof FieldGroup.Picker
>['options'][number];

const accountOption = (account: ProjectAccountChoice): PickerOption => ({
  value: account.id,
  label: account.label,
  subtitle: account.provider,
});

const hostRow = (
  entry: ProjectAccountHost,
  onChooseAccount: ProjectAccountsProps['onChooseAccount'],
): React.JSX.Element => (
  <FieldGroup.Picker
    key={entry.host}
    title={entry.host}
    value={entry.chosen ?? ''}
    summary={entry.chosen === undefined ? unchosenSummary : undefined}
    options={entry.accounts.map(accountOption)}
    presentation="menu"
    onValueChange={(accountId) => onChooseAccount(entry.host, accountId)}
  />
);
