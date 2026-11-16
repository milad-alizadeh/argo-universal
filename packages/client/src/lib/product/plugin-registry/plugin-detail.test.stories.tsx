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

// A read-only FieldGroup row: its key names it, and its children are its value.
const row = (
  key: string,
  props: WireNode['props'],
  children: WireNode[] = [],
): WireNode => ({ ...leaf('FieldGroup.Value', key, props), children });

const holding = (node: WireNode, children: WireNode[]): WireNode => ({
  ...node,
  children,
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
      slots: {},
    },
  ],
  // A Screen declares its header Actions; the Detail beneath it cannot.
  slots: {
    // The Screen's aside holds the Issue's properties, a read-only FieldGroup.
    aside: [
      holding(leaf('FieldGroup', 'fields', {}), [
        holding(leaf('FieldGroup.Section', 'section', {}), [
          row('status', { title: 'Status', value: 'In progress' }, [
            leaf('StatusDot', 'dot', { tone: 'info' }),
          ]),
          row('assignee', { title: 'Assignee' }, [
            leaf('Avatar', 'ana', {
              name: 'Ana Ruiz',
              accessibilityLabel: 'Ana Ruiz',
            }),
          ]),
          row('labels', { title: 'Labels' }, [
            leaf('Pill', 'bug', { text: 'bug' }),
            leaf('Pill', 'sync', { text: 'sync' }),
          ]),
          row('milestone', { title: 'Milestone' }, [
            leaf('Link', 'link', {
              label: 'v1.2',
              href: 'https://example.com/milestone/2',
            }),
          ]),
          row('source', {
            title: 'Source',
            value: 'GitHub',
          }),
        ]),
      ]),
    ],
    actions: [
      leaf('Action', 'close', {
        label: 'Close Issue',
        icon: 'check',
        onPress: { operation: 'closeIssue', args: {} },
      }),
    ],
  },
});

const onPageCall = fn(async () => {});

const meta = {
  title: 'Tests/Design System/Patterns/PluginRegistry/Detail',
} satisfies Meta;

export default meta;

export const DrawsContentPropertiesAndActions: StoryObj<typeof meta> = {
  render: () => <PluginTree root={root} onPageCall={onPageCall} />,
  play: async ({ canvas, userEvent }) => {
    onPageCall.mockClear();
    await expect(
      canvas.getByText('Sync stops on repositories with 50,000 files.'),
    ).toBeVisible();

    for (const name of [
      'Status, In progress',
      'Assignee, Ana Ruiz',
      'Labels, bug, sync',
      'Source, GitHub',
    ])
      await expect(canvas.getByRole('group', { name })).toBeVisible();
    await expect(
      canvas.getByRole('button', { name: 'Milestone, v1.2' }),
    ).toBeVisible();
    await expect(canvas.queryByText(/Update Argo/)).not.toBeInTheDocument();
    await userEvent.click(canvas.getByRole('button', { name: 'Close Issue' }));
    await expect(onPageCall).toHaveBeenLastCalledWith(
      { operation: 'closeIssue', args: {} },
      expect.objectContaining({ key: 'page#actions/close', name: 'onPress' }),
    );
  },
};
