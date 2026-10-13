import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { useState } from 'react';
import { View } from 'react-native';
import { expect, waitFor, within } from 'storybook/test';
import { ContentLayout } from '#lib/product/content-layout';
import { findToast } from '../../../../../mocks/find-toast';
import { eachLayout, layoutWidths } from '../../../../lib/generic/each-layout';
import { settleViewport } from '../../../../lib/generic/settle-viewport';
import {
  NewSessionView,
  type NewSessionViewProps,
  type ReadyNewSessionViewProps,
} from './new-session-view';
import {
  exampleProject,
  openingNewSession,
  readyNewSession,
  startingNewSession,
  typedDraft,
} from './new-session-view.mocks';

const pressedAttribute = 'aria-pressed';
const newWorktreeLabel = 'New worktree';
const sendLabel = 'Send';
const messageLabel = 'Message';
const failedStartMessage = 'The Agent exited before it was ready.';
const setupStepText = 'Run `claude login` on the Server, then check again.';
const projectLabel = `Project: ${exampleProject.name}`;

const meta = {
  title: 'Tests/NewSessionView',
  parameters: { screenPreview: true },
  args: { view: { state: 'ready', ...readyNewSession } },
  render: ({ view }): React.JSX.Element => <NewSessionView {...view} />,
} satisfies Meta<{ view: NewSessionViewProps }>;
export default meta;
type Story = StoryObj<typeof meta>;

// The checkout follows the reader's choice, as the screen's state does.
function ChoosingCheckout(): React.JSX.Element {
  const [newWorktree, setNewWorktree] = useState(true);
  const { configuration } = readyNewSession;
  return (
    <NewSessionView
      state="ready"
      {...readyNewSession}
      configuration={{
        ...configuration,
        checkout: {
          ...configuration.checkout,
          newWorktree,
          onNewWorktreeChange: setNewWorktree,
        },
      }}
    />
  );
}

export const NarrowMainColumn: Story = {
  render: () => (
    <View className="h-full w-[600px]">
      <ContentLayout>
        <ChoosingCheckout />
      </ContentLayout>
    </View>
  ),
  play: async ({ canvas, userEvent }) => {
    await settleViewport(layoutWidths.wide);
    const checkout = await canvas.findByRole('button', { name: 'Checkout' });
    await expect(checkout).toHaveTextContent(newWorktreeLabel);
    await expect(checkout).not.toHaveTextContent('main');
    await expect(
      canvas.getAllByRole('button', { name: 'Checkout' }),
    ).toHaveLength(1);
    await userEvent.click(checkout);
    await userEvent.click(
      await within(document.body).findByRole('button', { name: 'Local' }),
    );
    await expect(checkout).toHaveTextContent('Local');
  },
};

export const CheckoutChoice: Story = {
  render: () => <ChoosingCheckout />,
  play: async ({ canvas, userEvent }) => {
    const overlay = within(document.body);
    await settleViewport(layoutWidths.wide);
    const trigger = await canvas.findByRole('button', { name: 'Checkout' });
    await expect(trigger).toHaveTextContent(newWorktreeLabel);
    await userEvent.click(trigger);
    await expect(
      await overlay.findByRole('button', { name: /^New worktree$/ }),
    ).toHaveAttribute(pressedAttribute, 'true');
    await expect(overlay.queryByRole('switch')).not.toBeInTheDocument();
    await expect(
      overlay.queryByRole('textbox', { name: 'Search branches' }),
    ).not.toBeInTheDocument();
    await userEvent.click(overlay.getByRole('button', { name: /^Local$/ }));
    await waitFor(() =>
      expect(overlay.queryByRole('dialog')).not.toBeInTheDocument(),
    );
    await expect(trigger).toHaveTextContent('Local');
    await userEvent.click(trigger);
    await expect(
      await overlay.findByRole('button', { name: /^Local$/ }),
    ).toHaveAttribute(pressedAttribute, 'true');
    await expect(
      overlay.getByRole('button', { name: /^New worktree$/ }),
    ).toHaveAttribute(pressedAttribute, 'false');
    await userEvent.click(
      overlay.getByRole('button', { name: /^New worktree$/ }),
    );
    await waitFor(() =>
      expect(overlay.queryByRole('dialog')).not.toBeInTheDocument(),
    );
    await expect(trigger).toHaveTextContent(newWorktreeLabel);
  },
};

export const Ready: Story = {
  play: async ({ canvas }) =>
    eachLayout(async (wide) => {
      await expect(
        await canvas.findByRole('button', { name: projectLabel }),
      ).toBeVisible();
      // The Server runs on this computer, so the host is not named.
      await expect(
        canvas.queryByText(readyNewSession.serverName),
      ).not.toBeInTheDocument();
      const heading = canvas.queryByRole('heading', {
        name: 'What should we work on?',
      });
      await (wide ? expect(heading).toBeVisible() : expect(heading).toBeNull());
      // A phone shows the checkout among the rows; a wide window keeps it in the envelope.
      await expect(
        canvas.getAllByRole('button', { name: 'Checkout' }),
      ).toHaveLength(1);
      await expect(
        canvas.getByRole('textbox', { name: messageLabel }),
      ).toBeVisible();
      // An empty prompt has nothing to send.
      await expect(
        canvas.getByRole('button', { name: sendLabel }),
      ).toBeDisabled();
      await expect(
        canvas.queryByRole('button', { name: 'Open Session' }),
      ).toBeNull();
      await expect(canvas.queryByText('Reconnecting…')).toBeNull();
    }),
};

function readyArgs(changes: Partial<ReadyNewSessionViewProps>): Story['args'] {
  return { view: { state: 'ready', ...readyNewSession, ...changes } };
}

export const SendsTheFirstPrompt: Story = {
  args: readyArgs({ draft: typedDraft }),
  play: async ({ args, canvas, userEvent }) => {
    await settleViewport(layoutWidths.phone);
    await userEvent.click(
      await canvas.findByRole('button', { name: sendLabel }),
    );
    if (args.view.state !== 'ready') throw new Error('The view is not ready.');
    await expect(args.view.onSend).toHaveBeenCalledOnce();
    await expect(args.view.onSend).toHaveBeenCalledWith(typedDraft);
  },
};

export const SendsWhileTheSessionOpens: Story = {
  args: readyArgs(openingNewSession),
  play: async ({ args, canvas, userEvent }) => {
    await eachLayout(async () => {
      await expect(
        await canvas.findByRole('progressbar', { name: 'Opening the Session' }),
      ).toBeVisible();
      await expect(
        canvas.getByRole('button', { name: sendLabel }),
      ).toBeEnabled();
    });
    await userEvent.click(canvas.getByRole('button', { name: sendLabel }));
    if (args.view.state !== 'ready') throw new Error('The view is not ready.');
    await expect(args.view.onSend).toHaveBeenCalledWith(typedDraft);
  },
};

export const Reconnecting: Story = {
  args: readyArgs({ connected: false, canOpen: false, draft: typedDraft }),
  play: async ({ canvas }) =>
    eachLayout(async () => {
      await expect(
        await canvas.findByRole('img', { name: 'Reconnecting' }),
      ).toBeVisible();
      await expect(canvas.getByText('Reconnecting…')).toBeVisible();
      await expect(
        canvas.getByRole('button', { name: sendLabel }),
      ).toBeDisabled();
    }),
};

export const NeedsSetup: Story = {
  args: readyArgs({
    canOpen: false,
    draft: typedDraft,
    setupStep: setupStepText,
  }),
  play: async ({ canvas }) =>
    eachLayout(async () => {
      await expect(await canvas.findByRole('alert')).toHaveTextContent(
        setupStepText,
      );
      await expect(
        canvas.getByRole('button', { name: sendLabel }),
      ).toBeDisabled();
    }),
};

export const Starting: Story = {
  args: readyArgs(startingNewSession),
  play: async ({ canvas }) =>
    eachLayout(async () => {
      const [prompt] = await canvas.findAllByText(typedDraft.text);
      await expect(prompt).toBeVisible();
      await expect(canvas.getByRole('status')).toHaveAccessibleName(/^Working/);
      await expect(
        canvas.queryByRole('progressbar', { name: 'Sending' }),
      ).toBeNull();
      await expect(
        canvas.getByRole('textbox', { name: messageLabel }),
      ).toHaveValue('');
      await expect(
        canvas.getByRole('button', { name: sendLabel }),
      ).toBeDisabled();
      await expect(
        canvas.getByRole('button', { name: projectLabel }),
      ).toBeDisabled();
    }),
};

export const FailedStart: Story = {
  args: readyArgs({ openError: failedStartMessage, draft: typedDraft }),
  play: async ({ canvas }) => {
    await expect(await findToast("Couldn't open the Session")).toBeVisible();
    await expect(await findToast(failedStartMessage)).toBeVisible();
    await expect(canvas.queryByRole('alert')).toBeNull();
    await expect(canvas.getByRole('button', { name: sendLabel })).toBeEnabled();
  },
};

export const LoadFailure: Story = {
  args: { view: { state: 'load-failed' } },
  play: async ({ canvas }) => {
    await expect(await findToast("Couldn't load New Session")).toBeVisible();
    await expect(canvas.queryByRole('button', { name: 'Retry' })).toBeNull();
    await expect(canvas.queryByRole('alert')).toBeNull();
  },
};
