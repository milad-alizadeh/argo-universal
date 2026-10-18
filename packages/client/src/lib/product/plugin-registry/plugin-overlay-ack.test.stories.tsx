import { WireNode } from '@repo/contracts/plugins/wire';
import fixture from '@repo/mocks/plugins/overlays.json' with { type: 'json' };
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn, waitFor, within, fireEvent } from 'storybook/test';
import { PluginTree } from './plugin-registry';

const root = WireNode.parse(fixture);

const onEvent = fn();

const meta = {
  title: 'Tests/Plugin overlay acknowledgement',
  render: (): React.JSX.Element => <PluginTree root={root} onEvent={onEvent} />,
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const ConfirmWaitsForRunningEdit: Story = {
  play: async ({ canvas, userEvent }) => {
    const page = within(document.body);
    const answer = Promise.withResolvers<void>();
    onEvent.mockReturnValueOnce(answer.promise);
    await userEvent.click(canvas.getByRole('button', { name: 'Open dialog' }));
    const field = await page.findByRole('textbox', { name: 'Overlay name' });
    await fireEvent.change(field, { target: { value: 'Atlas' } });
    await waitFor(() => expect(onEvent).toHaveBeenCalledOnce());
    const confirm = page.getByRole('button', { name: 'Apply dialog' });
    await userEvent.click(confirm);
    await expect(confirm).toHaveAttribute('aria-busy', 'true');
    await expect(onEvent).toHaveBeenCalledOnce();
    answer.resolve();
    await waitFor(() => expect(onEvent).toHaveBeenCalledTimes(2));
    await expect(onEvent).toHaveBeenLastCalledWith('overlays/dialog-trigger', {
      event: 'onAction',
      payload: { path: ['onPress', 'onConfirm'] },
    });
    await waitFor(() => expect(page.queryByRole('textbox')).toBeNull());
  },
};
