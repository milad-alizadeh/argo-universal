import { settleLayout } from '@repo/kit/mocks/story-layout';
import { Text } from '@repo/kit/primitives/content/text';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn, within } from 'storybook/test';
import { homePath } from '#features/settings';
import {
  localProject,
  otherDeviceName,
  worktreeProject,
} from '../../../../features/settings/components/settings-pages.mocks';
import {
  chosenAccounts,
  unchosenAccounts,
} from './project-detail-accounts-fixtures';
import { ProjectDetailView } from './project-detail-view';

const meta = {
  title: 'Tests/Screens/Settings/Project',
  component: ProjectDetailView,
  parameters: { screenPreview: true },
  args: {
    name: worktreeProject.name,
    project: { status: 'loaded', project: worktreeProject },
    onBack: fn(),
  },
  beforeEach: (): Promise<void> => settleLayout('wide'),
} satisfies Meta<typeof ProjectDetailView>;

export default meta;

type Story = StoryObj<typeof meta>;

const githubHost = 'api.github.com';

export const ShowsTheFolderAndCheckout: Story = {
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('heading', { name: worktreeProject.name, level: 1 }),
    ).toBeVisible();
    await expect(
      canvas.getByText(homePath(worktreeProject.path)),
    ).toBeVisible();
    await expect(canvas.getByText('New worktree')).toBeVisible();
    await expect(canvas.getByText('Base branch')).toBeVisible();
  },
};

// The Server cannot change the archive setting or remove a Project yet.
export const OffersNoUnbuiltChanges: Story = {
  play: async ({ canvas }) => {
    const archive = canvas.getByRole('switch', {
      name: 'Delete the worktree on archive',
    });

    await expect(archive).toBeDisabled();
    await expect(archive).toBeChecked();
    await expect(
      canvas.getByRole('button', { name: 'Remove Project' }),
    ).toBeDisabled();
  },
};

export const BackLeavesTheProject: Story = {
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Back' }));
    await expect(args.onBack).toHaveBeenCalledOnce();
  },
};

export const AProjectOnTheServerDeviceNamesNoDevice: Story = {
  play: async ({ canvas }) => {
    await expect(
      canvas.getByText(homePath(worktreeProject.path)),
    ).toBeVisible();
    await expect(canvas.queryByText('Device')).not.toBeInTheDocument();
  },
};

export const AProjectOnAnotherDeviceNamesItsDevice: Story = {
  args: { otherDevice: otherDeviceName },
  play: async ({ canvas }) => {
    await expect(canvas.getByText(otherDeviceName)).toBeVisible();
  },
};

export const ALocalProjectHasNoBaseBranch: Story = {
  args: {
    name: localProject.name,
    project: { status: 'loaded', project: localProject },
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Local')).toBeVisible();
    await expect(canvas.queryByText('Base branch')).not.toBeInTheDocument();
  },
};

export const SaysWhenTheProjectIsMissing: Story = {
  args: { name: 'old-api', project: { status: 'missing' } },
  play: async ({ canvas }) => {
    await expect(canvas.getByText(/no Project named old-api/)).toBeVisible();
  },
};

// ADR-0035: the Project details Slot sits between Folder and New Sessions.
export const ThePluginSlotSitsBetweenFolderAndNewSessions: Story = {
  args: { renderPluginSlot: () => <Text>Plugin slot content</Text> },
  play: async ({ canvas }) => {
    const folder = await canvas.findByText('Folder');
    const slot = await canvas.findByText('Plugin slot content');
    const newSessions = await canvas.findByText('New Sessions');

    await expect(
      folder.compareDocumentPosition(slot) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    await expect(
      slot.compareDocumentPosition(newSessions) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  },
};

export const EachNewSessionsRowShowsItsDescription: Story = {
  play: async ({ canvas }) => {
    await expect(
      canvas.getByText("A new worktree keeps each Session's files apart"),
    ).toBeVisible();
    await expect(
      canvas.getByText('New worktrees branch from it'),
    ).toBeVisible();
    await expect(
      canvas.getByText(
        'Archiving a Session removes its folder; the branch stays',
      ),
    ).toBeVisible();
  },
};

export const ShowsASpinnerWhileTheProjectLoads: Story = {
  args: { project: { status: 'loading' } },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Loading the Project…')).toBeVisible();
    await expect(canvas.getByRole('progressbar')).toBeVisible();
  },
};

export const AccountsSitBelowFolder: Story = {
  args: { accounts: { hosts: chosenAccounts, onChooseAccount: fn() } },
  play: async ({ canvas }) => {
    const folder = await canvas.findByText('Folder');
    const accounts = await canvas.findByText('Accounts');

    await expect(
      folder.compareDocumentPosition(accounts) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    await expect(canvas.getByText(githubHost)).toBeVisible();
    await expect(canvas.getByText('milad-alizadeh')).toBeVisible();
    await expect(canvas.getByText('api.linear.app')).toBeVisible();
    await expect(
      canvas.getByText('Used by every Plugin in this Project.'),
    ).toBeVisible();
  },
};

export const AnUnchosenHostAsksToChooseAnAccount: Story = {
  args: { accounts: { hosts: unchosenAccounts, onChooseAccount: fn() } },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('Choose Account')).toBeVisible();
    await expect(canvas.queryByText('milad-alizadeh')).not.toBeInTheDocument();
  },
};

export const ChoosingAnAccountReportsTheHostAndAccount: Story = {
  args: { accounts: { hosts: unchosenAccounts, onChooseAccount: fn() } },
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.click(
      await canvas.findByRole('button', { name: githubHost }),
    );
    await userEvent.click(
      await within(document.body).findByRole('option', { name: /argo-work/ }),
    );
    await expect(args.accounts?.onChooseAccount).toHaveBeenCalledWith(
      githubHost,
      'account-github-2',
    );
  },
};

export const NoAccountsDrawsNoSection: Story = {
  args: { accounts: { hosts: [], onChooseAccount: fn() } },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('Folder')).toBeVisible();
    await expect(canvas.queryByText('Accounts')).not.toBeInTheDocument();
  },
};
