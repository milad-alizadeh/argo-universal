import { WireNode } from '@repo/contracts/plugins/wire';
import fixtures from '@repo/mocks/plugins/controls.json' with { type: 'json' };
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn, waitFor, within, fireEvent } from 'storybook/test';
import { PluginTree } from './plugin-registry';

const meta = {
  title: 'Tests/Plugin controls',
  render: (): React.JSX.Element => (
    <>
      {roots.slice(2).map((root) => (
        <PluginTree key={root.key} root={root} onEvent={onEvent} />
      ))}
    </>
  ),
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

const onEvent = fn();

const disabledAttribute = 'aria-disabled';

const environment = 'Environment';

const roots = fixtures.map((fixture) => WireNode.parse(fixture));

export const BinaryControls: Story = {
  render: () => (
    <>
      {roots.slice(0, 2).map((root) => (
        <PluginTree key={root.key} root={root} onEvent={onEvent} />
      ))}
    </>
  ),
  play: async ({ canvas, userEvent }) => {
    for (const [role, name, key] of [
      ['switch', 'Notifications', 'switch'],
      ['checkbox', 'Include archived', 'checkbox'],
    ] as const) {
      const answer = Promise.withResolvers<void>();
      onEvent.mockReturnValueOnce(answer.promise);
      const control = canvas.getByRole(role, { name });
      await userEvent.click(control);
      await expect(control).toBeChecked();
      await expect(control).toHaveAttribute(disabledAttribute, 'true');
      await expect(onEvent).toHaveBeenCalledWith(key, {
        event: 'onValueChange',
        payload: true,
      });
      answer.reject(new Error('Handler failed'));
      await waitFor(() => expect(control).not.toBeChecked());
      await expect(control).not.toHaveAttribute(disabledAttribute, 'true');
      const accepted = Promise.withResolvers<void>();
      onEvent.mockReturnValueOnce(accepted.promise);
      await userEvent.click(control);
      await expect(control).toHaveAttribute(disabledAttribute, 'true');
      accepted.resolve();
      await waitFor(() =>
        expect(control).not.toHaveAttribute(disabledAttribute, 'true'),
      );
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
    await expect(onEvent).toHaveBeenCalledWith('picker', {
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
      expect(onEvent).toHaveBeenCalledWith('textinput', {
        event: 'onChangeText',
        payload: 'Atlas',
      }),
    );
    await userEvent.type(field, '{Enter}');
    await expect(onEvent).toHaveBeenCalledWith('textinput', {
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
