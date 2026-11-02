import { contentWideMin, settleLayout } from '@repo/kit/mocks/story-layout';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn, mocked } from 'storybook/test';
import { ProjectNewView } from './project-new-view';

const folder = '/Users/you/Developer/argo-universal';

const addLabel = 'Add Project';

const chooseLabel = 'Choose Folder…';

const cloneAction = 'Clone Project';

const meta = {
  title: 'Tests/Screens/Settings/ProjectNewView',
  component: ProjectNewView,
  parameters: { screenPreview: true },
  args: {
    onSubmit: fn(),
    onCancel: fn(),
    onChooseFolder: fn<() => Promise<string | null>>(async () => folder),
  },
  beforeEach: (): Promise<void> => settleLayout('wide'),
} satisfies Meta<typeof ProjectNewView>;

export default meta;

type Story = StoryObj<typeof meta>;

// Only a path returned by the native picker can be submitted on this Mac.
export const AddSendsTheFolder: Story = {
  play: async ({ canvas, args, userEvent }) => {
    await expect(canvas.getByRole('button', { name: addLabel })).toBeDisabled();
    await expect(canvas.queryByLabelText('Folder')).not.toBeInTheDocument();
    await userEvent.click(canvas.getByRole('button', { name: chooseLabel }));
    await expect(args.onChooseFolder).toHaveBeenCalledOnce();
    await expect(canvas.getByText(folder)).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: addLabel }));
    await expect(args.onSubmit).toHaveBeenCalledWith('folder', folder);
    await expect(
      canvas.queryByRole('button', { name: 'New' }),
    ).not.toBeInTheDocument();
  },
};

// Canceling the native picker leaves the selected folder intact.
export const CanceledPickerKeepsSelection: Story = {
  args: {
    onChooseFolder: fn<() => Promise<string | null>>(async () => folder),
  },
  play: async ({ canvas, args, userEvent }) => {
    mocked(args.onChooseFolder)
      ?.mockResolvedValueOnce(folder)
      .mockResolvedValue(null);
    await userEvent.click(canvas.getByRole('button', { name: chooseLabel }));
    await userEvent.click(canvas.getByRole('button', { name: 'Change…' }));
    await expect(canvas.getByText(folder)).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: addLabel }));
    await expect(args.onSubmit).toHaveBeenCalledWith('folder', folder);
  },
};

// A failed native dialog is recoverable without leaving the form.
export const PickerFailureCanBeRetried: Story = {
  args: {
    onChooseFolder: fn<() => Promise<string | null>>(async () => folder),
  },
  play: async ({ canvas, args, userEvent }) => {
    mocked(args.onChooseFolder)
      ?.mockRejectedValueOnce(new Error('Unavailable'))
      .mockResolvedValue(folder);
    await userEvent.click(canvas.getByRole('button', { name: chooseLabel }));
    await expect(canvas.getByRole('alert')).toHaveTextContent(
      'Could not open the folder picker. Try again.',
    );
    await userEvent.click(canvas.getByRole('button', { name: chooseLabel }));
    await expect(canvas.getByText(folder)).toBeVisible();
    await expect(canvas.queryByRole('alert')).not.toBeInTheDocument();
  },
};

// Clone sends the trimmed URL and clears it when the source changes.
export const CloneSendsTheRepository: Story = {
  play: async ({ canvas, args, userEvent }) => {
    await userEvent.click(
      canvas.getByRole('button', { name: 'Clone Repository' }),
    );
    await expect(
      canvas.getByRole('button', { name: cloneAction }),
    ).toBeDisabled();
    await userEvent.type(
      canvas.getByLabelText('Repository URL'),
      ' https://github.com/owner/repo.git ',
    );
    await userEvent.click(canvas.getByRole('button', { name: cloneAction }));
    await expect(args.onSubmit).toHaveBeenCalledWith(
      'clone',
      'https://github.com/owner/repo.git',
    );

    const track = canvas
      .getByRole('group', { name: 'Add a Project from' })
      .getBoundingClientRect();

    const input = canvas
      .getByLabelText('Repository URL')
      .getBoundingClientRect();

    const action = canvas
      .getByRole('button', { name: cloneAction })
      .getBoundingClientRect();

    await expect(track.width).toBeLessThanOrEqual(contentWideMin());
    await expect(action.top - input.bottom).toBeLessThan(100);
    await expect(Math.abs(action.right - track.right)).toBeLessThan(1);

    await userEvent.click(
      canvas.getByRole('button', { name: 'Existing Folder' }),
    );
    await expect(canvas.getByRole('button', { name: addLabel })).toBeDisabled();
  },
};

// A Device without the native bridge enters a path on its Server.
export const ServerFolderCanBeTyped: Story = {
  args: { onChooseFolder: undefined },
  play: async ({ canvas, args, userEvent }) => {
    await userEvent.type(canvas.getByLabelText('Folder'), ' /work/app ');
    await userEvent.click(canvas.getByRole('button', { name: addLabel }));
    await expect(args.onSubmit).toHaveBeenCalledWith('folder', '/work/app');
  },
};

// Cancel returns to the Projects list.
export const CancelLeavesTheForm: Story = {
  play: async ({ canvas, args, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Cancel' }));
    await expect(args.onCancel).toHaveBeenCalledOnce();
  },
};

// Nothing typed is nothing to add.
export const AddWithNothingTypedSendsNothing: Story = {
  play: async ({ canvas, args }) => {
    await expect(canvas.getByRole('button', { name: addLabel })).toBeDisabled();
    await expect(args.onSubmit).not.toHaveBeenCalled();
  },
};

// The pending state blocks duplicate submissions and source changes.
export const AddingCannotBeSentTwice: Story = {
  args: { adding: true },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('button', { name: 'Adding…' }),
    ).toBeDisabled();
    await expect(
      canvas.getByRole('button', { name: chooseLabel }),
    ).toBeDisabled();
    await expect(
      canvas.getByRole('button', { name: 'Clone Repository' }),
    ).toBeDisabled();
  },
};
