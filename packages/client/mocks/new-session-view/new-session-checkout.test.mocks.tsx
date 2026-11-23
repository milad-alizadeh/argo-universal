import { eachLayout, settleLayout } from '@repo/kit/mocks/story-layout';
import type * as React from 'react';
import { useState } from 'react';
import { View } from 'react-native';
import { expect, waitFor, within } from 'storybook/test';
import { ContentLayout } from '#lib/product/content-layout';
import { SessionNewView } from '../../src/screens/sessions/$id/session-new-view';
import { readyNewSession } from '../../src/screens/sessions/$id/session-new-view.mocks';
import type { Story } from './new-session-story.test.mocks';

// The trigger names the branch a new worktree starts from.
const newWorktreeLabel = 'New worktree from main';

// The checkout follows the reader's choice, as the screen's state does.
function ChoosingCheckout(): React.JSX.Element {
  const [newWorktree, setNewWorktree] = useState(true);
  const { configuration } = readyNewSession;

  return (
    <SessionNewView
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

export const narrowMainColumn: Story = {
  render: () => (
    <View className="h-full w-150">
      <ContentLayout>
        <ChoosingCheckout />
      </ContentLayout>
    </View>
  ),
  play: async ({ canvas, userEvent }) => {
    await settleLayout('wide');
    const checkout = await canvas.findByRole('button', { name: 'Checkout' });
    await expect(checkout).toHaveTextContent(newWorktreeLabel);
    await expect(
      canvas.getAllByRole('button', { name: 'Checkout' }),
    ).toHaveLength(1);
    await userEvent.click(checkout);
    await userEvent.click(
      await within(document.body).findByRole('radio', { name: 'Local' }),
    );
    await expect(checkout).toHaveTextContent('Local');
    await expect(checkout).not.toHaveTextContent('main');
  },
};

export const checkoutChoice: Story = {
  render: () => <ChoosingCheckout />,
  play: async ({ canvas, userEvent }) => {
    const overlay = within(document.body);
    await settleLayout('wide');
    const trigger = await canvas.findByRole('button', { name: 'Checkout' });
    await expect(trigger).toHaveTextContent(newWorktreeLabel);
    await userEvent.click(trigger);
    await expect(
      await overlay.findByRole('radio', { name: /^New worktree$/ }),
    ).toBeChecked();
    await expect(overlay.queryByRole('switch')).not.toBeInTheDocument();
    await expect(
      overlay.queryByRole('textbox', { name: 'Search branches' }),
    ).not.toBeInTheDocument();
    await userEvent.click(overlay.getByRole('radio', { name: /^Local$/ }));
    await waitFor(() =>
      expect(overlay.queryByRole('dialog')).not.toBeInTheDocument(),
    );
    await expect(trigger).toHaveTextContent('Local');
    await userEvent.click(trigger);
    await expect(
      await overlay.findByRole('radio', { name: /^Local$/ }),
    ).toBeChecked();
    await expect(
      overlay.getByRole('radio', { name: /^New worktree$/ }),
    ).not.toBeChecked();
    await userEvent.click(
      overlay.getByRole('radio', { name: /^New worktree$/ }),
    );
    await waitFor(() =>
      expect(overlay.queryByRole('dialog')).not.toBeInTheDocument(),
    );
    await expect(trigger).toHaveTextContent(newWorktreeLabel);
  },
};

const longBranch = 'claude/tokens-from-figma-2026-11-18-design-system-catch-up';

// A long base branch truncates inside the window rather than pushing the trigger off it.
export const longBaseBranch: Story = {
  args: {
    view: {
      state: 'ready',
      ...readyNewSession,
      configuration: {
        ...readyNewSession.configuration,
        checkout: {
          ...readyNewSession.configuration.checkout,
          branch: longBranch,
        },
      },
    },
  },
  play: async ({ canvas }) =>
    eachLayout(async () => {
      const trigger = await canvas.findByRole('button', { name: 'Checkout' });
      const box = trigger.getBoundingClientRect();

      await expect(trigger).toHaveTextContent(/^New worktree from claude\//);
      await expect(box.left).toBeGreaterThanOrEqual(0);
      await expect(box.right).toBeLessThanOrEqual(window.innerWidth);
    }),
};
