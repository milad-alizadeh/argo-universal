import type { WireNode } from '@repo/contracts/plugins/wire';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn, waitFor } from 'storybook/test';
import { PluginTree } from './plugin-registry';

const onEvent = fn();

const onPageCall = fn(() => Promise.resolve());

const searchLabel = 'Search Issues';

type Parts = Pick<WireNode, 'props'> & Partial<Pick<WireNode, 'children'>>;

const node = (type: string, key: string, parts: Parts): WireNode => ({
  type,
  key,
  children: [],
  slots: {},
  ...parts,
});

// A Loader page's search and selection: Page state when bound, held by the App alone when not.
const page = (bound: boolean): WireNode =>
  node('Screen', 'page', {
    props: {
      title: 'Issues',
      search: { label: searchLabel },
      value: '',
      ...(bound && { onChangeText: { bind: 'query' } }),
    },
    children: [node('List', 'list', { props: {}, children: [choices(bound)] })],
  });

const choices = (bound: boolean): WireNode =>
  node('List.Section', 'choices', {
    props: {
      selectionMode: 'multiple',
      selection: [],
      ...(bound && { onSelectionChange: { bind: 'picked' } }),
    },
    children: [
      node('ListItem', 'argo', { props: { id: 'argo', title: 'Argo' } }),
    ],
  });

const meta = {
  title: 'Tests/Design System/Patterns/PluginRegistry/PageControls',
} satisfies Meta;

const drawn = (bound: boolean) => (): React.JSX.Element => (
  <PluginTree root={page(bound)} onEvent={onEvent} onPageCall={onPageCall} />
);

export default meta;

type Story = StoryObj<typeof meta>;

async function searchFor(
  { canvas, userEvent }: Parameters<NonNullable<Story['play']>>[0],
  text: string,
): Promise<HTMLElement> {
  await userEvent.click(canvas.getByRole('button', { name: searchLabel }));
  const field = canvas.getByRole('textbox', { name: searchLabel });
  await userEvent.type(field, text);

  return field;
}

export const UnboundSearchAndSelectionStayInTheApp: Story = {
  render: drawn(false),
  play: async (context) => {
    onEvent.mockClear();
    onPageCall.mockClear();
    const field = await searchFor(context, 'flaky');
    await context.userEvent.click(
      context.canvas.getByRole('button', { name: 'Argo' }),
    );

    await expect(field).toHaveValue('flaky');
    await expect(onEvent).not.toHaveBeenCalled();
    await expect(onPageCall).not.toHaveBeenCalled();
  },
};

export const BoundSearchAndSelectionReachThePage: Story = {
  render: drawn(true),
  play: async (context) => {
    onEvent.mockClear();
    onPageCall.mockClear();
    const field = await searchFor(context, 'flaky');

    await expect(field).toHaveValue('flaky');
    await waitFor(() =>
      expect(onPageCall).toHaveBeenLastCalledWith({ bind: 'query' }, 'flaky'),
    );

    await context.userEvent.click(
      context.canvas.getByRole('button', { name: 'Argo' }),
    );
    await waitFor(() =>
      expect(onPageCall).toHaveBeenLastCalledWith({ bind: 'picked' }, ['argo']),
    );
    await expect(onEvent).not.toHaveBeenCalled();
  },
};
