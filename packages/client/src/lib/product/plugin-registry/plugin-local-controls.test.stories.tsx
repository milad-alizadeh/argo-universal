import { WireNode } from '@repo/contracts/plugins/wire';
import fixtures from '@repo/mocks/plugins/controls.json' with { type: 'json' };
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn, fireEvent } from 'storybook/test';
import { PluginTree } from './plugin-registry';

const onEvent = fn();

// A draft control is sent without the handler, so the App keeps its value locally.
function localControl(node: WireNode): WireNode {
  const props = { ...node.props };
  delete props.onValueChange;

  return { ...node, props };
}

const roots = fixtures
  .filter((node) => ['Switch', 'Slider'].includes(node.type))
  .map((fixture) => localControl(WireNode.parse(fixture)));

const meta = {
  title: 'Tests/Design System/Patterns/PluginRegistry/LocalControls',
  render: (): React.JSX.Element => (
    <>
      {roots.map((root) => (
        <PluginTree key={root.key} root={root} onEvent={onEvent} />
      ))}
    </>
  ),
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const DraftsWithoutHandlers: Story = {
  play: async ({ canvas, userEvent }) => {
    const toggle = canvas.getByRole('switch', { name: 'Notifications' });
    await userEvent.click(toggle);
    await expect(toggle).toBeChecked();
    const slider = canvas.getByRole('slider', { name: 'Concurrency' });
    await fireEvent.change(slider, { target: { value: '7' } });
    await expect(slider).toHaveValue('7');
    await expect(onEvent).not.toHaveBeenCalled();
  },
};
