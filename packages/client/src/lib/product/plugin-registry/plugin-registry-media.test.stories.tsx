import { WireNode } from '@repo/contracts/plugins/wire';
import fixture from '@repo/mocks/plugins/media.json' with { type: 'json' };
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn } from 'storybook/test';
import { PluginTree } from './plugin-registry';

const root = WireNode.parse(fixture);

const meta = {
  title: 'Tests/Design System/Patterns/PluginRegistry/Media',
  render: (): React.JSX.Element => <PluginTree root={root} onEvent={fn()} />,
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const DrawsResolvedVideoAndAudio: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByLabelText('Demo clip')).toBeVisible();
    await expect(
      canvas.getByRole('button', { name: 'Play Chime' }),
    ).toBeVisible();
  },
};

// A Plugin's own URL never reaches the App: the node is refused and nothing loads from that host.
export const RefusesAnUnresolvedSource: Story = {
  play: async ({ canvas }) => {
    await expect(
      canvas.queryByLabelText('Unresolved clip'),
    ).not.toBeInTheDocument();
  },
};
