import { WireNode } from '@repo/contracts/plugins/wire';
import fixtures from '@repo/mocks/plugins/controls.json' with { type: 'json' };
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn, waitFor, fireEvent } from 'storybook/test';
import { PluginTree } from './plugin-registry';

const root = WireNode.parse(fixtures.find((node) => node.type === 'TextInput'));

const onEvent = fn();

const meta = {
  title: 'Tests/Plugin field submission acknowledgement',
  render: (): React.JSX.Element => <PluginTree root={root} onEvent={onEvent} />,
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const SubmitWaitsForEdit: Story = {
  play: async ({ canvas, userEvent }) => {
    const answer = Promise.withResolvers<void>();
    onEvent.mockReturnValueOnce(answer.promise);
    const field = canvas.getByRole('textbox', { name: 'Project name' });
    await fireEvent.change(field, { target: { value: 'Atlas' } });
    await userEvent.type(field, '{Enter}');
    await waitFor(() => expect(onEvent).toHaveBeenCalledOnce());
    await expect(onEvent).toHaveBeenCalledWith('textinput', {
      event: 'onChangeText',
      payload: 'Atlas',
    });
    answer.resolve();
    await waitFor(() => expect(onEvent).toHaveBeenCalledTimes(2));
    await expect(onEvent).toHaveBeenLastCalledWith('textinput', {
      event: 'onSubmit',
    });
  },
};
