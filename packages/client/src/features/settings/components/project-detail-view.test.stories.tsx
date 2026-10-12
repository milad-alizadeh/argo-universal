import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn } from 'storybook/test';
import { layoutWidths } from '../../../lib/generic/each-layout';
import { settleViewport } from '../../../lib/generic/settle-viewport';
import { homePath } from '../state/home-path';
import { ProjectDetailView } from './project-detail-view';
import {
  localProject,
  otherDeviceName,
  worktreeProject,
} from './settings-pages.mocks';

const meta = {
  title: 'Tests/Screens/Settings/Project',
  component: ProjectDetailView,
  parameters: { screenPreview: true },
  args: {
    name: worktreeProject.name,
    project: { status: 'loaded', project: worktreeProject },
    onBack: fn(),
  },
  beforeEach: (): Promise<void> => settleViewport(layoutWidths.wide),
} satisfies Meta<typeof ProjectDetailView>;
export default meta;
type Story = StoryObj<typeof meta>;

export const ShowsTheFolderAndCheckout: Story = {
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('heading', { name: worktreeProject.name, level: 1 }),
    ).toBeVisible();
    await expect(
      canvas.getByRole('group', { name: homePath(worktreeProject.path) }),
    ).toBeVisible();
    await expect(canvas.getByText('New worktree')).toBeVisible();
    await expect(
      canvas.getByRole('group', { name: 'Base branch' }),
    ).toBeVisible();
  },
};

// The Server cannot change the archive setting or remove a Project yet.
export const OffersNoUnbuiltChanges: Story = {
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('switch', { name: 'Delete the worktree on archive' }),
    ).toHaveAttribute('aria-disabled', 'true');
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

const deviceField = `Device, ${otherDeviceName}`;

export const AProjectOnTheServerDeviceNamesNoDevice: Story = {
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('group', { name: homePath(worktreeProject.path) }),
    ).toBeVisible();
    await expect(
      canvas.queryByRole('group', { name: /^Device/ }),
    ).not.toBeInTheDocument();
  },
};

export const AProjectOnAnotherDeviceNamesItsDevice: Story = {
  args: { otherDevice: otherDeviceName },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('group', { name: deviceField }),
    ).toBeVisible();
  },
};

export const ALocalProjectHasNoBaseBranch: Story = {
  args: {
    name: localProject.name,
    project: { status: 'loaded', project: localProject },
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Local')).toBeVisible();
    await expect(
      canvas.queryByRole('group', { name: 'Base branch' }),
    ).not.toBeInTheDocument();
  },
};

export const SaysWhenTheProjectIsMissing: Story = {
  args: { name: 'old-api', project: { status: 'missing' } },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByText('The Server has no Project named old-api.'),
    ).toBeVisible();
  },
};
