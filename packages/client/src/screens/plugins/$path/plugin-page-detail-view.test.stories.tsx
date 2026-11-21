import { settleOverlays } from '@repo/kit/mocks/settle-overlays';
import { settleLayout } from '@repo/kit/mocks/story-layout';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { expect, fn, waitFor, within } from 'storybook/test';
import {
  DraftServer,
  draftPage,
  loaderError,
} from '../../../features/plugins/hooks/draft-page.mocks';
import { PluginPageDetailView } from './plugin-page-detail-view';

function DraftPageView({ dev }: { dev: boolean }): React.JSX.Element {
  return (
    <DraftServer dev={dev}>
      <PluginPageDetailView
        {...draftPage}
        title="Issues"
        onOpenPage={fn()}
        onBack={null}
      />
    </DraftServer>
  );
}

const meta = {
  title: 'Tests/Screens/Plugins/Plugin page/PageDetailView',
  component: DraftPageView,
  args: { dev: true },
} satisfies Meta<typeof DraftPageView>;

export default meta;

type Story = StoryObj<typeof meta>;

// The State menu opens over the page, outside the story's own canvas.
const menu = (): ReturnType<typeof within> => within(document.body);

export const DevDraftPageShowsTheBar: Story = {
  play: async ({ canvas }) => {
    await settleLayout('wide');

    await expect(
      await canvas.findByRole('toolbar', { name: 'Draft' }),
    ).toBeVisible();
    await expect(await canvas.findByText(/Issues list/)).toBeVisible();
  },
};

export const InstalledPageNeverShowsTheBar: Story = {
  args: { dev: false },
  play: async ({ canvas }) => {
    await settleLayout('wide');

    await expect(await canvas.findByText(/Issues list/)).toBeVisible();
    await expect(canvas.queryByRole('toolbar', { name: 'Draft' })).toBeNull();
  },
};

export const StateTheLoaderFailsForSaysWhy: Story = {
  play: async ({ canvas, userEvent }) => {
    await settleLayout('wide');
    await expect(await canvas.findByText(/Issues list/)).toBeVisible();

    await userEvent.click(await canvas.findByRole('button', { name: 'Error' }));

    const reason = await canvas.findByText(new RegExp(loaderError));

    await waitFor(() => expect(reason).toBeVisible());
    await expect(canvas.queryByText(/Issues list/)).toBeNull();
  },
};

export const StateTheDraftDoesNotDeclareSaysWhy: Story = {
  play: async ({ canvas, userEvent }) => {
    await settleLayout('phone');
    await expect(await canvas.findByText(/Issues list/)).toBeVisible();

    await userEvent.click(await canvas.findByRole('button', { name: 'State' }));
    await settleOverlays();
    await userEvent.click(
      await menu().findByRole('menuitemradio', { name: /Empty/ }),
    );

    const reason = await canvas.findByText(/Empty state is not declared/);

    await waitFor(() => expect(reason).toBeVisible());
    await expect(canvas.queryByText(/Issues list/)).toBeNull();
  },
};
