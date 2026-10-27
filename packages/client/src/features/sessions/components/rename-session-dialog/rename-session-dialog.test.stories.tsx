import { settleLayout } from '@repo/kit/mocks/story-layout';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn, waitFor, within } from 'storybook/test';
import { RenameSessionDialog } from './rename-session-dialog';

const title = 'Build the Session layout';

const meta = {
  title: 'Tests/Sessions/RenameSessionDialog',
  component: RenameSessionDialog,
  args: { title, open: true, onRename: fn(), onClose: fn() },
} satisfies Meta<typeof RenameSessionDialog>;

export default meta;

type Story = StoryObj<typeof meta>;

type Layout = 'phone' | 'wide';

const body = within(document.body);

const dialogName = { name: 'Rename Session' };

async function openDialog(): Promise<ReturnType<typeof within>> {
  return within(await body.findByRole('dialog', dialogName));
}

async function titleField(): Promise<HTMLInputElement> {
  const field = (await openDialog()).getByLabelText('Title');

  if (!(field instanceof HTMLInputElement))
    throw new Error('The Title field is not a text input.');

  return field;
}

// The field takes focus with the whole title selected, so typing replaces it; nothing has failed yet, so it is valid.
function opensSelectedAt(layout: Layout): Story {
  return {
    beforeEach: (): Promise<void> => settleLayout(layout),
    play: async () => {
      const field = await titleField();
      await waitFor(() => expect(field).toHaveFocus());
      await expect(field.selectionStart).toBe(0);
      await expect(field.selectionEnd).toBe(title.length);
      await expect(field).not.toBeInvalid();
    },
  };
}

export const OpensSelectedOnPhone: Story = opensSelectedAt('phone');

export const OpensSelectedWide: Story = opensSelectedAt('wide');

// Save, or Enter in the field, saves the typed title without its outer spaces.
function savesAt(layout: Layout, submit: 'button' | 'enter'): Story {
  return {
    beforeEach: (): Promise<void> => settleLayout(layout),
    play: async ({ args, userEvent }) => {
      const field = await titleField();
      await userEvent.clear(field);
      await userEvent.type(field, '  Port the mock CLIs ');
      await (submit === 'enter'
        ? userEvent.keyboard('{Enter}')
        : userEvent.click(
            (await openDialog()).getByRole('button', { name: 'Save' }),
          ));
      await expect(args.onRename).toHaveBeenCalledWith('Port the mock CLIs');
      await expect(args.onClose).not.toHaveBeenCalled();
    },
  };
}

export const SavesOnPhone: Story = savesAt('phone', 'button');

export const SavesWide: Story = savesAt('wide', 'button');

export const EnterSavesWide: Story = savesAt('wide', 'enter');

// A blank title, or the same one again, closes the dialog and keeps the old title without a word.
function keepsTitleAt(layout: Layout, draft: string): Story {
  return {
    beforeEach: (): Promise<void> => settleLayout(layout),
    play: async ({ args, userEvent }) => {
      const field = await titleField();
      await userEvent.clear(field);

      if (draft) await userEvent.type(field, draft);

      await userEvent.click(
        (await openDialog()).getByRole('button', { name: 'Save' }),
      );
      await expect(args.onClose).toHaveBeenCalledOnce();
      await expect(args.onRename).not.toHaveBeenCalled();
    },
  };
}

export const BlankTitleRevertsOnPhone: Story = keepsTitleAt('phone', '   ');

export const BlankTitleRevertsWide: Story = keepsTitleAt('wide', '');

export const SameTitleClosesWide: Story = keepsTitleAt('wide', title);

// Cancel and Escape close without saving.
function cancelsAt(layout: Layout, how: 'cancel' | 'escape'): Story {
  return {
    beforeEach: (): Promise<void> => settleLayout(layout),
    play: async ({ args, userEvent }) => {
      const dialog = await openDialog();
      await (how === 'escape'
        ? userEvent.keyboard('{Escape}')
        : userEvent.click(dialog.getByRole('button', { name: 'Cancel' })));
      await waitFor(() => expect(args.onClose).toHaveBeenCalledOnce());
      await expect(args.onRename).not.toHaveBeenCalled();
    },
  };
}

export const CancelClosesOnPhone: Story = cancelsAt('phone', 'cancel');

export const CancelClosesWide: Story = cancelsAt('wide', 'cancel');

export const EscapeClosesWide: Story = cancelsAt('wide', 'escape');

const failure = 'Couldn’t rename the Session. Try again.';

// A failed rename leaves the dialog open, the field invalid and the reason under it.
function failedAt(layout: Layout): Story {
  return {
    args: { error: failure },
    beforeEach: (): Promise<void> => settleLayout(layout),
    play: async () => {
      const dialog = await openDialog();
      await waitFor(() => expect(dialog.getByText(failure)).toBeVisible());
      await expect(dialog.getByRole('alert')).toHaveTextContent(failure);
      await expect(dialog.getByLabelText('Title')).toHaveAttribute(
        'aria-invalid',
        'true',
      );
    },
  };
}

export const FailedOnPhone: Story = failedAt('phone');

export const FailedWide: Story = failedAt('wide');
