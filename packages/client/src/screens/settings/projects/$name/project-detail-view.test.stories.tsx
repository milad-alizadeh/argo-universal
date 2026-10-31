import { settleLayout } from '@repo/kit/mocks/story-layout';
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
import { pluginContributions } from './project-detail-plugins-fixtures';
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

const withSpies = pluginContributions.map((contribution) => ({
  ...contribution,
  onEvent: fn(),
}));

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

// ADR-0035: each Plugin in the Project details Slot is a section of its own, a card beside Folder's, in the Server's order.
export const EachPluginIsASectionOfItsOwn: Story = {
  args: { pluginContributions: withSpies },
  play: async ({ canvas }) => {
    const folderTitle = await canvas.findByText('Folder');
    const exampleTitle = await canvas.findByText('Example');
    const trackerTitle = await canvas.findByText('Issue tracker');
    const newSessionsTitle = await canvas.findByText('New Sessions');
    const titles = [folderTitle, exampleTitle, trackerTitle, newSessionsTitle];
    const folder = sectionOf(folderTitle, titles);
    const example = sectionOf(exampleTitle, titles);
    const tracker = sectionOf(trackerTitle, titles);
    const newSessions = sectionOf(newSessionsTitle, titles);

    await expect(new Set([folder, example, tracker, newSessions]).size).toBe(4);
    await expect(example.parentElement).toBe(folder.parentElement);
    await expect(tracker.parentElement).toBe(folder.parentElement);

    const order = [folder, example, tracker, newSessions].map((section) =>
      Array.prototype.indexOf.call(folder.parentElement?.children, section),
    );

    await expect(order).toEqual([...order].sort((a, b) => a - b));
    await expect(example).toContainElement(canvas.getByText('Hello from argo'));
    await expect(example).not.toContainElement(
      canvas.getByText('GitHub Issues'),
    );
    await expect(tracker).toContainElement(canvas.getByText('GitHub Issues'));
  },
};

export const NoPluginsAddNoSection: Story = {
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('Folder')).toBeVisible();
    await expect(canvas.queryByText('Example')).not.toBeInTheDocument();
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

// A section is the highest ancestor of its title that holds no other section's title.
function sectionOf(title: HTMLElement, titles: HTMLElement[]): HTMLElement {
  const others = titles.filter((other) => other !== title);
  let section = title;

  while (
    section.parentElement &&
    !others.some((other) => section.parentElement?.contains(other))
  )
    section = section.parentElement;

  return section;
}
