import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn } from 'storybook/test';
import { eachLayout, layoutWidths } from '../../../lib/generic/each-layout';
import { findToast } from '../../../lib/generic/find-toast';
import { settleViewport } from '../../../lib/generic/settle-viewport';
import { homePath } from '../state/home-path';
import { ProjectListView } from './project-list-view';
import {
  localProject,
  serverCaption,
  settingsProjects,
  worktreeProject,
} from './settings-pages.mocks';

const meta = {
  title: 'Tests/Screens/Settings/Projects',
  component: ProjectListView,
  parameters: { screenPreview: true },
  args: {
    caption: serverCaption,
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
    await expect(canvas.getByText(serverCaption)).toBeVisible();
    await expect(
      canvas.getByText(`${settingsProjects.length} Projects`),
    ).toBeVisible();
    await expect(
      canvas.getByRole('button', { name: 'Add Project' }),
    ).toBeDisabled();
    await userEvent.click(
      canvas.getByRole('link', { name: localProject.name }),
    );
    await expect(args.onOpenProject).toHaveBeenCalledWith(localProject.name);
  },
};

export const RowsNameTheProjectWithoutItsFolder: Story = {
  play: async ({ canvas }) => {
    await eachLayout(async () => {
      for (const project of settingsProjects) {
        await expect(
          canvas.getByRole('link', { name: project.name }),
        ).toBeVisible();
        await expect(canvas.queryByText(homePath(project.path))).toBeNull();
      }
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
      canvas.getByRole('link', { name: localProject.name }),
    ).toBeVisible();
    await expect(
      canvas.queryByRole('link', { name: worktreeProject.name }),
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
