import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn } from 'storybook/test';
import { homePath } from '#features/settings';
import { findToast } from '../../../../mocks/find-toast';
import {
  localProject,
  missingFolderProject,
  settingsProjects,
  worktreeProject,
} from '../../../features/settings/components/settings-pages.mocks';
import { eachLayout, layoutWidths } from '../../../lib/generic/each-layout';
import { settleViewport } from '../../../lib/generic/settle-viewport';
import { ProjectListView } from './project-list-view';

const folderNotFound = 'Folder not found';

// Each row's trailing detail, from the fixture facts: a hosted origin, none, and a missing folder.
const rowDetails = [
  { project: worktreeProject, detail: 'GitHub' },
  { project: localProject, detail: 'No remote' },
  { project: missingFolderProject, detail: folderNotFound },
];

if (
  worktreeProject.remoteHost !== 'GitHub' ||
  localProject.remoteHost !== null ||
  missingFolderProject.folderExists
)
  throw new Error(
    'Recorded Projects need one on GitHub, one without a remote and one whose folder is gone.',
  );

const rowName = (project: (typeof settingsProjects)[number]): string =>
  `${project.name}, ${rowDetails.find((row) => row.project === project)?.detail}`;

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
    await expect(
      canvas.getByText(`${settingsProjects.length} Projects`),
    ).toBeVisible();
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

export const RowsSayWhereEachProjectIs: Story = {
  play: async ({ canvas }) => {
    for (const { project, detail } of rowDetails) {
      await expect(
        canvas.getByRole('link', { name: `${project.name}, ${detail}` }),
      ).toBeVisible();
      await expect(canvas.getByText(detail)).toBeVisible();
    }
  },
};

export const PhoneMarksAMissingFolderWithItsDotAlone: Story = {
  beforeEach: (): Promise<void> => settleViewport(layoutWidths.phone),
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('link', { name: rowName(missingFolderProject) }),
    ).toBeVisible();
    await expect(canvas.queryByText(folderNotFound)).toBeNull();
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
    await expect(canvas.getByText('No Project matches.')).toBeVisible();
  },
};

export const ShowsALoadErrorAsAToast: Story = {
  args: { projects: { status: 'error' } },
  play: async ({ canvas }) => {
    await expect(await findToast('Could not load Projects')).toBeVisible();
    await expect(canvas.getByText('Loading Projects…')).toBeVisible();
    await expect(canvas.queryByRole('button', { name: 'Retry' })).toBeNull();
    await expect(canvas.queryByRole('alert')).toBeNull();
  },
};
