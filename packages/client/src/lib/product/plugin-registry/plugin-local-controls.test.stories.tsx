import { WireNode } from '@repo/contracts/plugins/wire';
import fixtures from '@repo/mocks/plugins/controls.json' with { type: 'json' };
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn, within, fireEvent } from 'storybook/test';
import { PluginTree } from './plugin-registry';

const onEvent = fn();

function localControl(fixture: (typeof fixtures)[number]): WireNode {
  const root = WireNode.parse(fixture);
  const props = { ...root.props };
  delete props.onValueChange;

  return { ...root, props };
}

const roots = fixtures
  .filter((node) =>
    ['Switch', 'Checkbox', 'Picker', 'Slider'].includes(node.type),
  )
  .map(localControl);

const meta = {
  title: 'Tests/Plugin local controls',
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
    const checkbox = canvas.getByRole('checkbox', { name: 'Include archived' });
    await userEvent.click(checkbox);
    await expect(checkbox).toBeChecked();
    const picker = canvas.getByRole('button', { name: 'Environment' });
    await userEvent.click(picker);
    await userEvent.click(
      await within(document.body).findByRole('option', { name: 'Production' }),
    );
    await expect(picker).toHaveTextContent('Production');
    const slider = canvas.getByRole('slider', { name: 'Concurrency' });
    await fireEvent.change(slider, { target: { value: '7' } });
    await expect(slider).toHaveValue('7');
    await expect(onEvent).not.toHaveBeenCalled();
  },
};
