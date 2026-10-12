import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState } from 'react';
import { View } from 'react-native';
import { expect, fn, within, waitFor } from 'storybook/test';
import { AgentLoginSheet } from './agent-login-sheet';
import { loginSnapshot } from './agent-login.mocks';

const meta = {
  title: 'Tests/AgentLoginSheet',
  component: AgentLoginSheet,
  args: {
    agentName: 'Codex',
    snapshot: loginSnapshot('choose-method'),
    onChoose: fn(),
    onAnswer: fn(),
    onOpenBrowser: fn(),
    onCancel: fn(),
    onRetry: fn(),
    onClose: fn(),
  },
} satisfies Meta<typeof AgentLoginSheet>;
export default meta;
type Story = StoryObj<typeof meta>;
const browserSnapshot = loginSnapshot('awaiting-browser');
export const ChoosesExactAdvertisedMethod: Story = {
  play: async ({ args, userEvent }) => {
    const dialog = within(await within(document.body).findByRole('dialog'));
    await userEvent.click(dialog.getByRole('button', { name: 'Device code' }));
    await expect(args.onChoose).toHaveBeenCalledWith('device-code');
  },
};
export const OpeningBrowserDoesNotAnswer: Story = {
  args: { snapshot: browserSnapshot },
  play: async ({ args, userEvent }) => {
    const dialog = within(await within(document.body).findByRole('dialog'));
    await waitFor(() =>
      expect(
        dialog.getByText('Sign in and enter code ABCD-EFGH'),
      ).toBeVisible(),
    );
    await userEvent.click(
      dialog.getByRole('button', { name: 'Open sign-in page' }),
    );
    await expect(args.onOpenBrowser).toHaveBeenCalledWith(
      'https://example.com/sign-in',
    );
    await expect(args.onAnswer).not.toHaveBeenCalled();
  },
};
export const AnswersExactRequest: Story = {
  args: { snapshot: browserSnapshot },
  play: async ({ args, userEvent }) => {
    const dialog = within(await within(document.body).findByRole('dialog'));
    await userEvent.click(
      dialog.getByRole('button', { name: 'I’ve finished' }),
    );
    await expect(args.onAnswer).toHaveBeenCalledWith('request-42', 'accept');
  },
};
export const OtherAppCannotAct: Story = {
  args: { snapshot: loginSnapshot('other-app') },
  play: async () => {
    const dialog = within(await within(document.body).findByRole('dialog'));
    await waitFor(() =>
      expect(dialog.getByRole('button', { name: 'Done' })).toBeVisible(),
    );
    await expect(dialog.queryByRole('button', { name: 'Cancel' })).toBeNull();
    await expect(
      dialog.queryByRole('button', { name: 'Device code' }),
    ).toBeNull();
  },
};

export const CancelsSignInWithoutAccepting: Story = {
  args: { snapshot: browserSnapshot },
  play: async ({ args, userEvent }) => {
    const dialog = within(await within(document.body).findByRole('dialog'));
    await userEvent.click(dialog.getByRole('button', { name: 'Cancel' }));
    await expect(args.onCancel).toHaveBeenCalled();
    await expect(args.onAnswer).not.toHaveBeenCalled();
  },
};
export const StartingCannotCancelBeforeAdmission: Story = {
  args: { snapshot: undefined, busy: true },
  play: async () => {
    const dialog = within(await within(document.body).findByRole('dialog'));
    await expect(dialog.getByRole('button', { name: 'Cancel' })).toBeDisabled();
  },
};

export const BackClosesUnsupportedSignIn: Story = {
  args: { snapshot: loginSnapshot('unsupported') },
  render: function UnsupportedSignIn(args) {
    const [open, setOpen] = useState(true);
    const close = (): void => {
      args.onClose();
      setOpen(false);
    };
    return open ? <AgentLoginSheet {...args} onClose={close} /> : <View />;
  },
  play: async ({ args, userEvent }) => {
    const body = within(document.body);
    const dialog = within(await body.findByRole('dialog'));
    await userEvent.click(dialog.getByRole('button', { name: 'Back' }));
    await expect(args.onClose).toHaveBeenCalledOnce();
    await expect(args.onRetry).not.toHaveBeenCalled();
    await waitFor(() => expect(body.queryByRole('dialog')).toBeNull());
  },
};
