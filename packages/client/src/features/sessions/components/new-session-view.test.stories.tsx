import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { useState } from 'react';
import { View } from 'react-native';
import { expect, fn, waitFor, within } from 'storybook/test';
import { ContentLayout } from '#lib/product/content-layout';
import { eachLayout, layoutWidths } from '../../../lib/generic/each-layout';
import { settleViewport } from '../../../lib/generic/settle-viewport';
import {
  NewSessionView,
  type NewSessionViewProps,
  type ReadyNewSessionViewProps,
} from './new-session-view';
import { exampleProject, readyNewSession } from './new-session-view.mocks';

const pressedAttribute = 'aria-pressed';
const newWorktreeLabel = 'New worktree';
const openSessionLabel = 'Open Session';
const failedStartMessage = 'The Agent exited before it was ready.';
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
        await canvas.findByText(readyNewSession.serverName),
      ).toBeVisible();
      await expect(
        canvas.getByRole('button', { name: projectLabel }),
      ).toBeVisible();
      await expect(canvas.getByText('Start the Session in')).toBeVisible();
      const heading = canvas.queryByRole('heading', {
        name: 'What should we work on?',
      });
      await (wide ? expect(heading).toBeVisible() : expect(heading).toBeNull());
      // A phone shows the checkout among the rows; a wide window keeps it in the envelope.
      await expect(
        canvas.getAllByRole('button', { name: 'Checkout' }),
      ).toHaveLength(1);
      await expect(
        canvas.queryByRole('textbox', { name: 'Message' }),
      ).toBeNull();
      await expect(
        canvas.getByRole('img', { name: 'Connected' }),
      ).toBeVisible();
      await expect(canvas.queryByText('Reconnecting…')).toBeNull();
    }),
};

function readyArgs(changes: Partial<ReadyNewSessionViewProps>): Story['args'] {
  return { view: { state: 'ready', ...readyNewSession, ...changes } };
}

export const OpensTheSession: Story = {
  args: readyArgs({ onOpen: fn() }),
  play: async ({ canvas, args, userEvent }) => {
    await settleViewport(layoutWidths.phone);
    await userEvent.click(
      await canvas.findByRole('button', { name: openSessionLabel }),
    );
    if (args.view.state !== 'ready') throw new Error('The story needs ready.');
    await expect(args.view.onOpen).toHaveBeenCalledOnce();
  },
};

export const Reconnecting: Story = {
  args: readyArgs({ connected: false, canOpen: false }),
  play: async ({ canvas }) =>
    eachLayout(async () => {
      await expect(
        await canvas.findByRole('img', { name: 'Reconnecting' }),
      ).toBeVisible();
      await expect(canvas.getByText('Reconnecting…')).toBeVisible();
      await expect(
        canvas.getByRole('button', { name: openSessionLabel }),
      ).toBeDisabled();
    }),
};

export const Opening: Story = {
  args: readyArgs({ opening: true, canOpen: false }),
  play: async ({ canvas }) =>
    eachLayout(async () => {
      const button = await canvas.findByRole('button', {
        name: openSessionLabel,
      });
      await expect(button).toBeVisible();
      await expect(button).toHaveTextContent(openSessionLabel);
      await expect(button).toBeDisabled();
      await expect(button).toHaveAttribute('aria-busy', 'true');
      await expect(
        canvas.getByRole('button', { name: projectLabel }),
      ).toBeDisabled();
    }),
};

export const FailedStart: Story = {
  args: readyArgs({ openError: failedStartMessage }),
  play: async ({ canvas }) =>
    eachLayout(async () => {
      await expect(await canvas.findByRole('alert')).toHaveTextContent(
        `Couldn't open the Session. ${failedStartMessage}`,
      );
      await expect(
        canvas.getByRole('button', { name: openSessionLabel }),
      ).toBeEnabled();
    }),
};

export const LoadFailure: Story = {
  args: { view: { state: 'load-failed', onRetry: fn() } },
  play: async ({ canvas, args, userEvent }) => {
    await expect(
      await canvas.findByText("Couldn't load New Session"),
    ).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: 'Retry' }));
    if (args.view.state !== 'load-failed')
      throw new Error('The story needs a load failure.');
    await expect(args.view.onRetry).toHaveBeenCalledOnce();
  },
};
