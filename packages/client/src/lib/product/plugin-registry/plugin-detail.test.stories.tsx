import { WireNode } from '@repo/contracts/plugins/wire';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn } from 'storybook/test';
import { PluginTree } from './plugin-registry';

const leaf = (
  type: string,
  key: string,
  props: WireNode['props'],
): WireNode => ({
  type,
  key,
  props,
  children: [],
  slots: {},
});

const root = WireNode.parse({
  type: 'Screen',
  key: 'page',
  props: { title: 'Sync fails on large repos' },
  children: [
    {
      type: 'Detail',
      key: 'detail',
      props: { markdown: 'Sync stops on repositories with 50,000 files.' },
      children: [],
      slots: {
        metadata: [
          {
            type: 'Metadata',
            key: 'fields',
            props: {},
            children: [
              leaf('Metadata.StatusDot', 'status', {
                title: 'Status',
                text: 'In progress',
                tone: 'info',
              }),
              leaf('Metadata.Avatar', 'assignee', {
                title: 'Assignee',
                name: 'Ana Ruiz',
              }),
              {
                type: 'Metadata.Pills',
                key: 'labels',
                props: { title: 'Labels' },
                children: [
                  leaf('Pill', 'bug', { text: 'bug' }),
                  leaf('Pill', 'sync', { text: 'sync' }),
                ],
                slots: {},
              },
              leaf('Metadata.Link', 'milestone', {
                title: 'Milestone',
                text: 'v1.2',
                href: 'https://example.com/milestone/2',
              }),
              leaf('Metadata.Label', 'source', {
                title: 'Source',
                text: 'GitHub',
              }),
            ],
            slots: {},
          },
        ],
        actions: [
          {
            type: 'ActionList',
            key: 'actions',
            props: {},
            children: [
              leaf('Action', 'close', {
                label: 'Close Issue',
                icon: 'check',
                onPress: { $event: 'onPress' },
              }),
            ],
            slots: {},
          },
        ],
      },
    },
  ],
  slots: {},
});

const onEvent = fn();

const meta = {
  title: 'Tests/Design System/Patterns/PluginRegistry/Detail',
} satisfies Meta;

export default meta;

export const DrawsContentMetadataAndActions: StoryObj<typeof meta> = {
  render: () => <PluginTree root={root} onEvent={onEvent} />,
  play: async ({ canvas, userEvent }) => {
    onEvent.mockClear();
    await expect(
      canvas.getByText('Sync stops on repositories with 50,000 files.'),
    ).toBeVisible();

    for (const name of [
      'Status, In progress',
      'Assignee, Ana Ruiz',
      'Labels, bug, sync',
      'Milestone, v1.2',
      'Source, GitHub',
    ])
      await expect(canvas.getByRole('group', { name })).toBeVisible();
    await expect(canvas.queryByText(/Update Argo/)).not.toBeInTheDocument();
    await userEvent.click(canvas.getByRole('button', { name: 'Close Issue' }));
    await expect(onEvent).toHaveBeenLastCalledWith(
      'page/detail#actions/actions/close',
      { event: 'onPress' },
    );
  },
};
