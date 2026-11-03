import { settleOverlays } from '@repo/kit/mocks/settle-overlays';
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
import { newSessionBranches } from './project-detail-new-sessions-fixtures';
import {
  longPathProject,
  pluginItems,
} from './project-detail-plugins-fixtures';
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

const baseBranch = 'Base branch';

/*
 * The Issue tracker Plugin names its section and its one row the same, as the real Plugin does, so its section
 * title is the first of the two in the page's order.
 */
const trackerName = 'Issue tracker';

// The value the Tracker row shows, and the text a press of that row aims at.
const chosenTracker = 'GitHub Issues';

type Canvas = ReturnType<typeof within>;

const trackerSectionTitle = async (canvas: Canvas): Promise<HTMLElement> => {
  const [title] = await canvas.findAllByText(trackerName);

  return title ?? canvas.getByText(trackerName);
};

export const ShowsTheFolderAndCheckout: Story = {
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('heading', { name: worktreeProject.name, level: 1 }),
    ).toBeVisible();
    await expect(
      canvas.getByText(homePath(worktreeProject.path)),
    ).toBeVisible();
    await expect(canvas.getByText('New worktree')).toBeVisible();
    await expect(canvas.getByText(baseBranch)).toBeVisible();
  },
};

const startIn = /Start in/;

const archiveSwitch = { name: 'Delete the worktree on archive' };

const newSessions = {
  branches: newSessionBranches,
  onCheckoutChoiceChange: fn(),
  onDeleteWorktreeOnArchiveChange: fn(),
};

const clearNewSessions = async (): Promise<void> => {
  newSessions.onCheckoutChoiceChange.mockClear();
  newSessions.onDeleteWorktreeOnArchiveChange.mockClear();
  await settleLayout('wide');
};

// The Server cannot remove a Project yet (#517).
export const RemovingAProjectStaysUnbuilt: Story = {
  args: { newSessions },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('button', { name: 'Remove Project' }),
    ).toBeDisabled();
  },
};

// Until the page can save a change, nothing offers one.
export const OffersNoChangeWithoutControls: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('switch', archiveSwitch)).toBeDisabled();
    await expect(canvas.getByRole('switch', archiveSwitch)).toBeChecked();
  },
};

export const AMissingFolderOffersNoChange: Story = {
  args: {
    newSessions,
    project: {
      status: 'loaded',
      project: { ...worktreeProject, folderExists: false },
    },
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('switch', archiveSwitch)).toBeDisabled();
    await expect(canvas.getByRole('button', { name: startIn })).toBeDisabled();
  },
};

export const TurningOffArchiveCleanupAsksToSaveIt: Story = {
  args: { newSessions },
  beforeEach: clearNewSessions,
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('switch', archiveSwitch));
    await expect(
      newSessions.onDeleteWorktreeOnArchiveChange,
    ).toHaveBeenCalledWith(false);
  },
};

export const AKeptWorktreeIsWhatTheFooterSays: Story = {
  args: {
    newSessions,
    project: {
      status: 'loaded',
      project: { ...worktreeProject, deleteWorktreeOnArchive: false },
    },
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('switch', archiveSwitch)).not.toBeChecked();
    await expect(canvas.getByText(/keeps its folder/)).toBeVisible();
    await expect(
      canvas.queryByText(/removes its folder/),
    ).not.toBeInTheDocument();
  },
};

type Choosing = {
  canvas: Canvas;
  userEvent: { click: (element: Element) => Promise<void> };
};

const chooseFrom = async (
  { canvas, userEvent }: Choosing,
  row: RegExp | string,
  option: string,
): Promise<void> => {
  await userEvent.click(canvas.getByRole('button', { name: row }));

  const item = await within(document.body).findByRole('option', {
    name: option,
  });

  await settleOverlays(item);
  await userEvent.click(item);
};

export const ChoosingLocalAsksToSaveIt: Story = {
  args: { newSessions },
  beforeEach: clearNewSessions,
  play: async ({ canvas, userEvent }) => {
    await chooseFrom({ canvas, userEvent }, startIn, 'Local');
    await expect(newSessions.onCheckoutChoiceChange).toHaveBeenCalledWith({
      type: 'main',
    });
  },
};

export const ChoosingAWorktreeBranchesFromTheCurrentBranch: Story = {
  args: {
    newSessions,
    name: localProject.name,
    project: { status: 'loaded', project: localProject },
  },
  beforeEach: clearNewSessions,
  play: async ({ canvas, userEvent }) => {
    await expect(canvas.queryByText(baseBranch)).not.toBeInTheDocument();
    await chooseFrom({ canvas, userEvent }, startIn, 'New worktree');
    await expect(newSessions.onCheckoutChoiceChange).toHaveBeenCalledWith({
      type: 'worktree',
      baseBranch: newSessionBranches.currentBranch,
    });
  },
};

export const ChoosingABaseBranchAsksToSaveIt: Story = {
  args: { newSessions },
  beforeEach: clearNewSessions,
  play: async ({ canvas, userEvent }) => {
    await chooseFrom({ canvas, userEvent }, baseBranch, 'release');
    await expect(newSessions.onCheckoutChoiceChange).toHaveBeenCalledWith({
      type: 'worktree',
      baseBranch: 'release',
    });
  },
};

export const ABaseBranchThatIsGoneStaysShown: Story = {
  args: {
    newSessions,
    project: {
      status: 'loaded',
      project: {
        ...worktreeProject,
        checkoutChoice: { type: 'worktree', baseBranch: 'deleted-branch' },
      },
    },
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('deleted-branch')).toBeVisible();
  },
};

// Beside a long value the title keeps its width, so it is never cut down to a letter.
export const ALongPathLeavesTheTitleItsFullWidth: Story = {
  args: {
    project: { status: 'loaded', project: longPathProject },
  },
  play: async ({ canvas }) => {
    const title = await canvas.findByText('Path');

    await expect(title).toBeVisible();
    await expect(title.scrollWidth).toBeLessThanOrEqual(title.clientWidth);
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
    await expect(canvas.queryByText(baseBranch)).not.toBeInTheDocument();
  },
};

export const SaysWhenTheProjectIsMissing: Story = {
  args: { name: 'old-api', project: { status: 'missing' } },
  play: async ({ canvas }) => {
    await expect(canvas.getByText(/no Project named old-api/)).toBeVisible();
  },
};

// ADR-0035, ADR-0046: each Plugin in the Project details Slot is a section of its own, a card beside Folder's, in the Server's order and after Argo's own Folder, Accounts and New Sessions.
export const EachPluginIsASectionOfItsOwn: Story = {
  args: { pluginItems },
  play: async ({ canvas }) => {
    const folderTitle = await canvas.findByText('Folder');
    const exampleTitle = await canvas.findByText('Example');
    const trackerTitle = await trackerSectionTitle(canvas);
    const newSessionsTitle = await canvas.findByText('New Sessions');
    const titles = [folderTitle, newSessionsTitle, exampleTitle, trackerTitle];
    const folder = sectionOf(folderTitle, titles);
    const example = sectionOf(exampleTitle, titles);
    const tracker = sectionOf(trackerTitle, titles);
    const newSessions = sectionOf(newSessionsTitle, titles);

    await expect(new Set([folder, example, tracker, newSessions]).size).toBe(4);
    await expect(example.parentElement).toBe(folder.parentElement);
    await expect(tracker.parentElement).toBe(folder.parentElement);

    const order = [folder, newSessions, example, tracker].map((section) =>
      Array.prototype.indexOf.call(folder.parentElement?.children, section),
    );

    await expect(order).toEqual([...order].sort((a, b) => a - b));
    await expect(example).toContainElement(canvas.getByText('Pull requests'));
    await expect(example).not.toContainElement(canvas.getByText(chosenTracker));
    await expect(tracker).toContainElement(canvas.getByText(chosenTracker));
  },
};

/*
 * ADR-0046: one item is one row. A whole contribution in a single row frame was the bug (#1761, #1763): the rows ran
 * together with no separators, so each row has to be a child of the section of its own.
 */
export const EachPluginItemIsARowOfItsOwn: Story = {
  args: { pluginItems },
  play: async ({ canvas }) => {
    const pulls = await canvas.findByText('Pull requests');
    const sync = await canvas.findByText('Last sync');
    const first = rowApartFrom(pulls, sync);
    const second = rowApartFrom(sync, pulls);

    await expect(first).not.toBe(second);
    await expect(first.parentElement).toBe(second.parentElement);
  },
};

// A row that drills into a Plugin page opens it for this Project.
export const PressingAPluginRowOpensItsPage: Story = {
  args: { pluginItems, onOpenPluginPage: fn() },
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.click(await canvas.findByText(chosenTracker));

    await expect(args.onOpenPluginPage).toHaveBeenCalledWith(
      'issue-tracker',
      '/tracker',
    );
  },
};

// The row one item got: the highest ancestor of its text that the other item's row sits outside of.
function rowApartFrom(text: HTMLElement, other: HTMLElement): HTMLElement {
  let row = text;

  while (row.parentElement && !row.parentElement.contains(other))
    row = row.parentElement;

  return row;
}

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
