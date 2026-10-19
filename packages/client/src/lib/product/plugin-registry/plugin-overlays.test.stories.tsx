import { WireNode } from '@repo/contracts/plugins/wire';
import { applyPatch } from '@repo/contracts/plugins/wire-patch';
import fixture from '@repo/mocks/plugins/overlays.json' with { type: 'json' };
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn, waitFor, within } from 'storybook/test';
import { PluginTree } from './plugin-registry';

// The Plugin opens an overlay by setting its `open` prop, as a Server patch does.
const opened = (key: string): WireNode =>
  applyPatch(WireNode.parse(fixture), [
    { op: 'setProps', key: [key], props: { open: true } },
  ]);

const roots = { alert: opened('alert'), sheet: opened('sheet') };

const onEvent = fn();

const fieldName = 'Overlay name';

const meta = {
  title: 'Tests/Plugin overlays',
  args: { overlay: 'sheet' },
  render: ({ overlay }): React.JSX.Element => (
    <PluginTree root={roots[overlay]} onEvent={onEvent} />
  ),
} satisfies Meta<{ overlay: keyof typeof roots }>;

export default meta;

type Story = StoryObj<typeof meta>;

export const AlertAnswer: Story = {
  args: { overlay: 'alert' },
  play: async ({ userEvent }) => {
    const page = within(document.body);
    await userEvent.click(
      await page.findByRole('button', { name: 'Apply alert' }),
    );
    await waitFor(() =>
      expect(page.queryByRole('button', { name: 'Apply alert' })).toBeNull(),
    );
    await waitFor(() =>
      expect(onEvent.mock.calls).toEqual([
        ['overlays/alert', { event: 'onOpenChange', payload: false }],
        ['overlays/alert/apply', { event: 'onPress' }],
      ]),
    );
  },
};

export const SheetCloseReachesPlugin: Story = {
  play: async ({ userEvent }) => {
    const page = within(document.body);
    await page.findByRole('textbox', { name: fieldName });
    await userEvent.keyboard('{Escape}');
    await waitFor(() =>
      expect(page.queryByRole('textbox', { name: fieldName })).toBeNull(),
    );
    await expect(onEvent.mock.calls).toEqual([
      ['overlays/sheet', { event: 'onOpenChange', payload: false }],
    ]);
  },
};

export const DraftAndAcknowledgement: Story = {
  play: async ({ userEvent }) => {
    const page = within(document.body);
    const field = await page.findByRole('textbox', { name: fieldName });
    await userEvent.clear(field);
    await userEvent.type(field, 'Atlas');
    await waitFor(() =>
      expect(onEvent).toHaveBeenCalledWith('overlays/sheet/body/field', {
        event: 'onChangeText',
        payload: 'Atlas',
      }),
    );
    const answer = Promise.withResolvers<void>();
    onEvent.mockReturnValueOnce(answer.promise);
    const apply = page.getByRole('button', { name: 'Apply sheet' });
    await userEvent.click(apply);
    await expect(apply).toHaveAttribute('aria-busy', 'true');
    answer.reject(new Error('Refused'));
    await waitFor(() => expect(apply).toHaveAttribute('aria-busy', 'false'));
    await expect(field).toHaveValue('Atlas');
  },
};
