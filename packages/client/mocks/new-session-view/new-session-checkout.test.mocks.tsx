import type * as React from 'react';
import { useState } from 'react';
import { View } from 'react-native';
import { expect, waitFor, within } from 'storybook/test';
import { ContentLayout } from '#lib/product/content-layout';
import { NewSessionView } from '../../src/features/sessions/components/new-session-view/new-session-view';
import { readyNewSession } from '../../src/features/sessions/components/new-session-view/new-session-view.mocks';
import { layoutWidths } from '../../src/lib/generic/each-layout';
import { settleViewport } from '../../src/lib/generic/settle-viewport';
import type { Story } from './new-session-story.test.mocks';

const pressedAttribute = 'aria-pressed';
const newWorktreeLabel = 'New worktree';

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

export const narrowMainColumn: Story = {
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

export const checkoutChoice: Story = {
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
