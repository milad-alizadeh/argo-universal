import type { WireNode } from '@repo/contracts/plugins/wire';
import { layoutWidths } from '@repo/kit/each-layout';
import { settleViewport } from '@repo/kit/settle-viewport';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn, spyOn, waitFor } from 'storybook/test';
import { PluginTree } from './plugin-registry';

const root: WireNode = {
  type: 'Stack',
  key: 'content',
  props: { direction: 'column', gap: 4 },
  slots: {},
  children: [
    {
      type: 'Markdown',
      key: 'prose',
      props: { text: '## Release notes\n\n**Ready** to use.' },
      slots: {},
      children: [],
    },
    {
      type: 'Code',
      key: 'snippet',
      props: { code: 'const ready = true;', path: 'ready.ts' },
      slots: {},
      children: [],
    },
    {
      type: 'Link',
      key: 'url',
      props: { label: 'Documentation', href: 'https://example.com/docs' },
      slots: {},
      children: [],
    },
  ],
};

const meta = { title: 'Tests/Plugin Prose' } satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

const onEvent = fn(async () => {});

export const DrawsProse: Story = {
  render: () => <PluginTree root={root} onEvent={onEvent} />,
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('heading', { name: 'Release notes', level: 2 }),
    ).toBeVisible();
    await expect(
      canvas.getByRole('link', { name: 'Documentation' }),
    ).toHaveAttribute('href', 'https://example.com/docs');
  },
};

export const CopiesInTheApp: Story = {
  render: () => <PluginTree root={root} onEvent={onEvent} />,
  play: async ({ canvas, userEvent }) => {
    await settleViewport(layoutWidths.wide);

    const clipboard = spyOn(
      navigator.clipboard,
      'writeText',
    ).mockResolvedValue();

    try {
      await userEvent.tab();
      await userEvent.keyboard('{Enter}');
      await waitFor(() =>
        expect(clipboard).toHaveBeenCalledWith('const ready = true;'),
      );
      await expect(
        await canvas.findByRole('button', { name: 'Copied' }),
      ).toBeVisible();
      await expect(onEvent).not.toHaveBeenCalled();
    } finally {
      clipboard.mockRestore();
    }
  },
};
