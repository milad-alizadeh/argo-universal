import { WireNode } from '@repo/contracts/plugins/wire';
import fixtures from '@repo/mocks/plugins/controls.json' with { type: 'json' };
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn, waitFor, within, fireEvent } from 'storybook/test';
import { PluginTree } from './plugin-registry';

const meta = {
  title: 'Tests/Design System/Patterns/PluginRegistry/Controls',
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

const onEvent = fn();

const environment = 'Environment';

// The FieldGroup fixture's rows are keyed by their path.
const pickerKey = 'form/section/picker';

const toggleKey = 'form/section/toggle';

const textKey = 'form/section/textinput';

const roots = fixtures.map((fixture) => WireNode.parse(fixture));

export const BinaryControls: Story = {
  play: async ({ canvas, userEvent }) => {
    for (const [role, name, key] of [
      ['switch', 'Notifications', toggleKey],
    ] as const) {
      const answer = Promise.withResolvers<void>();
      onEvent.mockReturnValueOnce(answer.promise);
      const control = canvas.getByRole(role, { name });
      await userEvent.click(canvas.getByText(name));
      await expect(control).toBeChecked();
      await expect(control).toBeDisabled();
      await expect(onEvent).toHaveBeenCalledWith(key, {
        event: 'onValueChange',
        payload: true,
      });
      answer.reject(new Error('Handler failed'));
      await waitFor(() => expect(control).not.toBeChecked());
      await expect(control).not.toBeDisabled();
      const accepted = Promise.withResolvers<void>();
      onEvent.mockReturnValueOnce(accepted.promise);
      await userEvent.click(canvas.getByText(name));
      await expect(control).toBeDisabled();
      accepted.resolve();
      await waitFor(() => expect(control).not.toBeDisabled());
      await expect(control).toBeChecked();
    }
  },
};

export const SelectPicker: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: environment }));
    await userEvent.click(
      within(document.body).getByRole('option', { name: 'Production' }),
    );
    await expect(onEvent).toHaveBeenCalledWith(pickerKey, {
      event: 'onValueChange',
      payload: 'prod',
    });
  },
};

export const AdjustSlider: Story = {
  play: async ({ canvas }) => {
    const slider = canvas.getByRole('slider', { name: 'Concurrency' });
    await fireEvent.change(slider, { target: { value: '7' } });
    await waitFor(() =>
      expect(onEvent).toHaveBeenCalledWith('slider', {
        event: 'onValueChange',
        payload: 7,
      }),
    );
  },
};

export const EditAndSubmitText: Story = {
  play: async ({ canvas, userEvent }) => {
    const field = canvas.getByRole('textbox', { name: 'Project name' });
    await userEvent.clear(field);
    await userEvent.type(field, 'Atlas');
    await waitFor(() =>
      expect(onEvent).toHaveBeenCalledWith(textKey, {
        event: 'onChangeText',
        payload: 'Atlas',
      }),
    );
    await userEvent.type(field, '{Enter}');
    await expect(onEvent).toHaveBeenCalledWith(textKey, {
      event: 'onSubmit',
    });
  },
};

export const PressIconButton: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Add project' }));
    await expect(onEvent).toHaveBeenCalledWith('iconbutton', {
      event: 'onPress',
    });
  },
};

export const UseSplitButton: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: /^Deploy$/ }));
    await expect(onEvent).toHaveBeenCalledWith('splitbutton', {
      event: 'onPress',
    });
    await userEvent.click(
      canvas.getByRole('button', { name: 'More deployments' }),
    );
    await userEvent.click(
      within(document.body).getByRole('menuitem', { name: 'Deploy preview' }),
    );
    await expect(onEvent).toHaveBeenCalledWith('splitbutton/preview', {
      event: 'onPress',
    });
  },
};
