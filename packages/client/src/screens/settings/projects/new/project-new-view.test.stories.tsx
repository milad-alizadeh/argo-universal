import { settleLayout } from '@repo/kit/mocks/story-layout';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn } from 'storybook/test';
import { ProjectNewView } from './project-new-view';

const meta = {
  title: 'Tests/Screens/Settings/ProjectNewView',
  component: ProjectNewView,
  parameters: { screenPreview: true },
  args: { onSubmit: fn() },
  beforeEach: (): Promise<void> => settleLayout('wide'),
} satisfies Meta<typeof ProjectNewView>;

export default meta;

type Story = StoryObj<typeof meta>;

// A folder is the first way in, and goes out trimmed.
export const AddSendsTheFolder: Story = {
  play: async ({ canvas, args, userEvent }) => {
    await userEvent.type(canvas.getByLabelText('Folder'), ' /work/app ');
    await userEvent.click(canvas.getByRole('button', { name: 'Add' }));
    await expect(args.onSubmit).toHaveBeenCalledWith('folder', '/work/app');
  },
};

// Choosing Clone asks for a repository, and sends it as a clone.
export const CloneSendsTheRepository: Story = {
  play: async ({ canvas, args, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Clone' }));
    await userEvent.type(
      canvas.getByLabelText('Repository'),
      'https://github.com/owner/repo.git',
    );
    await userEvent.click(canvas.getByRole('button', { name: 'Add' }));
    await expect(args.onSubmit).toHaveBeenCalledWith(
      'clone',
      'https://github.com/owner/repo.git',
    );
  },
};

// Choosing New asks for a name, and sends it as a new Project.
export const NewSendsTheName: Story = {
  play: async ({ canvas, args, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'New' }));
    await userEvent.type(canvas.getByLabelText('Name'), 'notes');
    await userEvent.click(canvas.getByRole('button', { name: 'Add' }));
    await expect(args.onSubmit).toHaveBeenCalledWith('new', 'notes');
  },
};

// Nothing typed is nothing to add.
export const AddWithNothingTypedSendsNothing: Story = {
  play: async ({ canvas, args, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Add' }));
    await expect(args.onSubmit).not.toHaveBeenCalled();
  },
};

// While the Server adds it, Add cannot be pressed again.
export const AddingCannotBeSentTwice: Story = {
  args: { adding: true },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('button', { name: 'Adding…' }),
    ).toBeDisabled();
  },
};
