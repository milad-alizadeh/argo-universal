import { WireNode } from '@repo/contracts/plugins/wire';
import { applyPatch } from '@repo/contracts/plugins/wire-patch';
import fixture from '@repo/mocks/plugins/overlays.json' with { type: 'json' };
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn, waitFor, within, fireEvent } from 'storybook/test';
import { PluginTree } from './plugin-registry';

const root = applyPatch(WireNode.parse(fixture), [
  { op: 'setProps', key: ['sheet'], props: { open: true } },
]);

const onEvent = fn();

const meta = {
  title: 'Tests/Plugin overlay acknowledgement',
  render: (): React.JSX.Element => <PluginTree root={root} onEvent={onEvent} />,
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const ConfirmWaitsForRunningEdit: Story = {
  play: async ({ userEvent }) => {
    const page = within(document.body);
    const answer = Promise.withResolvers<void>();
    onEvent.mockReturnValueOnce(answer.promise);
    const field = await page.findByRole('textbox', { name: 'Overlay name' });
    await fireEvent.change(field, { target: { value: 'Atlas' } });
    await waitFor(() => expect(onEvent).toHaveBeenCalledOnce());
    const confirm = page.getByRole('button', { name: 'Apply sheet' });
    await userEvent.click(confirm);
    await expect(confirm).toHaveAttribute('aria-busy', 'true');
    await expect(onEvent).toHaveBeenCalledOnce();
    answer.resolve();
    await waitFor(() => expect(onEvent).toHaveBeenCalledTimes(2));
    await expect(onEvent).toHaveBeenLastCalledWith(
      'overlays/sheet/body/apply',
      { event: 'onPress' },
    );
  },
};
