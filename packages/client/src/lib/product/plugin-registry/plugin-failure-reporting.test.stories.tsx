import type { WireNode } from '@repo/contracts/plugins/wire';
import { dismissToasts } from '@repo/kit/primitives/overlays/toast';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, waitFor } from 'storybook/test';
import { allToasts, findToast } from '../../../../../kit/mocks/find-toast';
import { PluginTree } from './plugin-registry';

const meta = {
  title: 'Tests/Design System/Patterns/PluginRegistry/FailureReporting',
  parameters: { screenPreview: true },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

const pressFailed = 'That did not work';

const loadFailed = "Couldn't load more";

const refused = (): Promise<void> => Promise.reject(new Error('Refused'));

const pages: WireNode = {
  type: 'List',
  key: 'pages',
  slots: {},
  props: {
    accessibilityLabel: 'Paged list',
    pagination: { hasMore: true, onLoadMore: { loadMore: true } },
  },
  children: Array.from({ length: 40 }, (_, index) => ({
    type: 'ListItem',
    key: String(index),
    props: { title: `Item ${index + 1}` },
    children: [],
    slots: {},
  })),
};

const row: WireNode = {
  type: 'ListItem',
  key: 'row',
  props: { title: 'Deploy web', onPress: { operation: 'deploy', args: {} } },
  children: [],
  slots: {},
};

// Toasts outlive a story, so each play starts from a clear screen.
async function clearToasts(): Promise<void> {
  dismissToasts();
  await waitFor(async () => {
    await expect(await allToasts(pressFailed)).toHaveLength(0);
    await expect(await allToasts(loadFailed)).toHaveLength(0);
  });
}

export const AwaitedLoadReportsOnce: Story = {
  render: () => <PluginTree root={pages} onPageCall={refused} />,
  play: async ({ canvas }) => {
    await clearToasts();
    const scroll = await canvas.findByLabelText('Paged list');
    await waitFor(async () => {
      scroll.scrollTop = scroll.scrollHeight;
      scroll.dispatchEvent(new Event('scroll'));
      await expect(await allToasts(loadFailed)).toHaveLength(1);
    });
    await expect(await allToasts(pressFailed)).toHaveLength(0);
  },
};

export const UnawaitedPressReportsOnce: Story = {
  render: () => <PluginTree root={row} onPageCall={refused} />,
  play: async ({ canvas, userEvent }) => {
    await clearToasts();
    await userEvent.click(
      await canvas.findByRole('button', { name: 'Deploy web' }),
    );
    await findToast(pressFailed);
    await expect(await allToasts(pressFailed)).toHaveLength(1);
    await expect(await allToasts(loadFailed)).toHaveLength(0);
  },
};
