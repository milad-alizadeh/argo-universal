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
    // The Screen's aside holds the Issue's properties as FieldGroup rows.
    aside: [
      holding(leaf('FieldGroup', 'fields', {}), [
        holding(leaf('FieldGroup.Section', 'section', {}), [
          leaf('FieldGroup.Value', 'status', {
            title: 'Status',
            value: 'In progress',
            dot: 'info',
          }),
          leaf('FieldGroup.Value', 'assignee', {
            title: 'Assignee',
            value: 'Ana Ruiz',
          }),
          leaf('FieldGroup.Value', 'labels', {
            title: 'Labels',
            value: 'bug, sync',
          }),
          leaf('FieldGroup.Value', 'source', {
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
    await expect(canvas.queryByText(/Update Argo/)).not.toBeInTheDocument();
    await userEvent.click(canvas.getByRole('button', { name: 'Close Issue' }));
    await expect(onPageCall).toHaveBeenLastCalledWith(
      { operation: 'closeIssue', args: {} },
      expect.objectContaining({ key: 'page#actions/close', name: 'onPress' }),
    );
  },
};
