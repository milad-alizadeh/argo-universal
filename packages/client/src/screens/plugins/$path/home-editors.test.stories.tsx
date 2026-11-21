import { settleLayout } from '@repo/kit/mocks/story-layout';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn, screen, waitFor } from 'storybook/test';
import { PluginDetailView } from './plugin-detail-view';
import {
  homeLightEditor,
  homeScenesEditor,
} from './plugin-detail-view-fixtures';

const meta = {
  title: 'Tests/Screens/Plugins/Plugin page/HomeEditors',
  component: PluginDetailView,
  parameters: { screenPreview: true },
  args: { callbacks: { onPageCall: fn(async () => {}) } },
} satisfies Meta<typeof PluginDetailView>;

export default meta;

type Story = StoryObj<typeof meta>;

const narrow = 390;

const medium = 820;

const wide = 1280;

export const LightEditorKeepsItsControlsAcrossWidths: Story = {
  args: homeLightEditor,
  play: async () => {
    for (const width of [narrow, medium, wide]) {
      await settleLayout(width);
      await waitFor(() =>
        expect(screen.queryAllByRole('dialog')).toHaveLength(
          width === wide ? 0 : 1,
        ),
      );
      await expect(
        screen.getByRole('slider', { name: 'Colour' }),
      ).toBeVisible();
      await expect(
        screen.getByRole('slider', { name: /^Brightness$/u }),
      ).toBeVisible();
      await expect(screen.getByRole('button', { name: 'Done' })).toBeVisible();
    }
  },
};

export const SceneEditorSearchAndTilesStayVisible: Story = {
  args: homeScenesEditor,
  play: async ({ canvas }) => {
    await settleLayout(wide);
    await expect(
      canvas.getByRole('searchbox', { name: 'Search scenes' }),
    ).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'Focus' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  },
};
