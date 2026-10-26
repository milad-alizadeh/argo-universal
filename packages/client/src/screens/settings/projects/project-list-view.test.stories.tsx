import { eachLayout, layoutWidths } from '@repo/kit/each-layout';
import { findToast } from '@repo/kit/mocks/find-toast';
import { settleViewport } from '@repo/kit/settle-viewport';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn } from 'storybook/test';
import { homePath } from '#features/settings';
import {
  localProject,
  missingFolderProject,
  settingsProjects,
  worktreeProject,
} from '../../../features/settings/components/settings-pages.mocks';
import { ProjectListView } from './project-list-view';

const folderNotFound = 'Folder not found';

if (
  worktreeProject.remoteHost !== 'GitHub' ||
  localProject.remoteHost !== null ||
  missingFolderProject.folderExists
)
  throw new Error(
    'Recorded Projects need one on GitHub, one without a remote and one whose folder is gone.',
  );

// A row is named by its Project alone; only a missing folder adds its words.
const rowName = (project: (typeof settingsProjects)[number]): string =>
  project.folderExists ? project.name : `${project.name}, ${folderNotFound}`;

const meta = {
  title: 'Tests/Screens/Settings/Projects',
  component: ProjectListView,
  parameters: { screenPreview: true },
  args: {
    projects: { status: 'loaded', projects: settingsProjects },
    onOpenProject: fn(),
  },
  beforeEach: (): Promise<void> => settleViewport(layoutWidths.wide),
} satisfies Meta<typeof ProjectListView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const ListsAndOpensProjects: Story = {
  play: async ({ args, canvas, userEvent }) => {
    await expect(
      canvas.getByRole('heading', { name: 'Projects', level: 1 }),
    ).toBeVisible();
    // One plain list: no count heading over it.
    await expect(
      canvas.queryByText(`${settingsProjects.length} Projects`),
    ).toBeNull();
    await expect(
      canvas.getByRole('button', { name: 'Add Project' }),
    ).toBeDisabled();
    await userEvent.click(
      canvas.getByRole('link', { name: rowName(localProject) }),
    );
    await expect(args.onOpenProject).toHaveBeenCalledWith(localProject.name);
  },
};

export const RowsNameTheProjectWithoutItsFolder: Story = {
  play: async ({ canvas }) => {
    await eachLayout(async () => {
      for (const project of settingsProjects) {
        await expect(
          canvas.getByRole('link', { name: rowName(project) }),
        ).toBeVisible();
        await expect(canvas.queryByText(homePath(project.path))).toBeNull();
      }
    });
  },
};

// A missing folder says so in words at every width, as the row's value, with no badge beside it; a remote says nothing.
export const RowsSayOnlyAMissingFolder: Story = {
  play: async ({ canvas }) => {
    await eachLayout(async () => {
      await expect(canvas.getByText(folderNotFound)).toBeVisible();
      await expect(canvas.queryByText('GitHub')).toBeNull();
      await expect(canvas.queryByText('No remote')).toBeNull();
    });
  },
};

export const FindsAProjectByName: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(
      canvas.getByRole('button', { name: 'Search Projects' }),
    );
    await userEvent.type(
      canvas.getByRole('textbox', { name: 'Search Projects' }),
      localProject.name,
    );
    await expect(
      canvas.getByRole('link', { name: rowName(localProject) }),
    ).toBeVisible();
    await expect(
      canvas.queryByRole('link', { name: rowName(worktreeProject) }),
    ).not.toBeInTheDocument();
  },
};

export const SaysWhenNothingMatches: Story = {
  args: { initialSearch: 'nothing-here' },
  play: async ({ canvas }) => {
    await expect(canvas.getByText(/matches/)).toBeVisible();
  },
};

export const ShowsALoadErrorAsAToast: Story = {
  args: { projects: { status: 'error' } },
  play: async ({ canvas }) => {
    await expect(await findToast('Could not load Projects')).toBeVisible();
    // The loading rows stay up, and they are skeletons: shapes with nothing to press and nothing to read.
    await expect(
      canvas.queryByRole('button', { name: /Argo Universal/ }),
    ).toBeNull();
    await expect(canvas.queryByRole('button', { name: 'Retry' })).toBeNull();
    await expect(canvas.queryByRole('alert')).toBeNull();
  },
};
