import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn } from 'storybook/test';
import { CentredOverlayScope } from '#primitives/overlays/centred-overlay';
import { settleViewport } from '../../../settle-viewport';
import { IssueForm, type IssueDraft } from './form-example';

const submitted = fn<(draft: IssueDraft) => void>();

const cancelled = fn();

const meta = {
  title: 'Tests/Form',
  render: (): React.JSX.Element => (
    <CentredOverlayScope>
      <IssueForm onSubmit={submitted} onCancel={cancelled} />
    </CentredOverlayScope>
  ),
  beforeEach: async (): Promise<void> => {
    await settleViewport(1440);
    submitted.mockClear();
    cancelled.mockClear();
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const SubmitsEveryValue: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.type(canvas.getByLabelText('Title'), 'Sheet closes early');
    await userEvent.type(canvas.getByLabelText('Description'), 'On Android');
    await userEvent.click(canvas.getByRole('button', { name: 'Create' }));
    await expect(submitted).toHaveBeenCalledTimes(1);
    await expect(submitted).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Sheet closes early',
        description: 'On Android',
      }),
    );
  },
};

export const ShortcutSubmits: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.type(canvas.getByLabelText('Title'), 'Shortcut');
    await userEvent.keyboard('{Meta>}{Enter}{/Meta}');
    await expect(submitted).toHaveBeenCalledTimes(1);
    await expect(submitted).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Shortcut' }),
    );
    await userEvent.keyboard('{Control>}{Enter}{/Control}');
    await expect(submitted).toHaveBeenCalledTimes(2);
  },
};

export const CancelLeavesTheDraft: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Cancel' }));
    await expect(cancelled).toHaveBeenCalledTimes(1);
    await expect(submitted).not.toHaveBeenCalled();
  },
};

export const SubmittingLocksTheFields: Story = {
  render: () => (
    <CentredOverlayScope>
      <IssueForm
        loading
        initial={{ title: 'Locked', description: '' }}
        onSubmit={submitted}
        onCancel={cancelled}
      />
    </CentredOverlayScope>
  ),
  play: async ({ canvas, userEvent }) => {
    await expect(canvas.getByRole('button', { name: 'Create' })).toBeDisabled();
    await expect(canvas.getByRole('button', { name: 'Cancel' })).toBeDisabled();
    const title = canvas.getByLabelText('Title');

    // The locked fields are inert, so they take no focus even when focused outright.
    title.focus();
    await expect(title).not.toHaveFocus();
    await userEvent.keyboard('{Meta>}{Enter}{/Meta}');
    await expect(submitted).not.toHaveBeenCalled();
  },
};

export const InvalidTitle: Story = {
  render: () => (
    <CentredOverlayScope>
      <IssueForm titleError="Enter a title." onSubmit={submitted} />
    </CentredOverlayScope>
  ),
  play: async ({ canvas }) => {
    const title = canvas.getByLabelText('Title');
    await expect(title).toHaveAttribute('aria-invalid', 'true');
    await expect(title).toHaveAccessibleDescription('Enter a title.');
  },
};
