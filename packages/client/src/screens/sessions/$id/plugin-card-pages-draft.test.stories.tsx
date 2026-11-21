import { settleLayout } from '@repo/kit/mocks/story-layout';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { expect } from 'storybook/test';
import {
  DraftServer,
  draftPage,
} from '../../../features/plugins/hooks/draft-page.mocks';
import { PluginTabPage } from './plugin-card-pages';

function CardTab({ dev }: { dev: boolean }): React.JSX.Element {
  return (
    <DraftServer dev={dev}>
      <PluginTabPage
        {...draftPage}
        sessionId="session-1"
        projectId="project-1"
      />
    </DraftServer>
  );
}

const meta = {
  title: 'Tests/Screens/Sessions/Session/PluginCardPagesDraft',
  component: CardTab,
  args: { dev: true },
} satisfies Meta<typeof CardTab>;

export default meta;

type Story = StoryObj<typeof meta>;

export const DevDraftCardPageShowsTheBar: Story = {
  play: async ({ canvas }) => {
    await settleLayout('wide');

    await expect(await canvas.findByText(/Issues list/)).toBeVisible();
    await expect(
      await canvas.findByRole('toolbar', { name: 'Draft' }),
    ).toBeVisible();
  },
};

export const InstalledCardPageNeverShowsTheBar: Story = {
  args: { dev: false },
  play: async ({ canvas }) => {
    await settleLayout('wide');

    await expect(await canvas.findByText(/Issues list/)).toBeVisible();
    await expect(canvas.queryByRole('toolbar', { name: 'Draft' })).toBeNull();
  },
};
