import { WireNode } from '@repo/contracts/plugins/wire';
import fixtures from '@repo/mocks/plugins/segmented-secret.json' with { type: 'json' };
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn, waitFor } from 'storybook/test';
import { PluginTree } from './plugin-registry';

const password = 'password';

const tokenValue = 'test-token';

const roots = fixtures.map((fixture) => WireNode.parse(fixture));

const onEvent = fn();

const meta = {
  title: 'Tests/Design System/Patterns/PluginRegistry/SegmentedSecret',
  beforeEach: (): void => {
    onEvent.mockReset();
  },
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

export const SwitchView: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('radio', { name: 'Closed' }));
    await expect(canvas.getByRole('radio', { name: 'Closed' })).toBeChecked();
    await expect(canvas.getByRole('radio', { name: 'Open' })).not.toBeChecked();
    await expect(onEvent).toHaveBeenCalledWith('views', {
      event: 'onValueChange',
      payload: 'closed',
    });
  },
};

export const RefusedViewKeepsSelection: Story = {
  play: async ({ canvas, userEvent }) => {
    onEvent.mockRejectedValueOnce(new Error('Refused'));
    await userEvent.click(canvas.getByRole('radio', { name: 'Closed' }));
    await waitFor(() =>
      expect(canvas.getByRole('radio', { name: 'Open' })).toBeChecked(),
    );
    await expect(
      canvas.getByRole('radio', { name: 'Closed' }),
    ).not.toBeChecked();
  },
};

export const EditSecret: Story = {
  play: async ({ canvas, userEvent }) => {
    const field = canvas.getByLabelText('Token');
    await expect(field).toHaveAttribute('type', password);
    await expect(field).toHaveAttribute('aria-invalid', 'true');
    await expect(canvas.getByText('Invalid token')).toBeVisible();
    await userEvent.type(field, tokenValue);
    await waitFor(() =>
      expect(onEvent).toHaveBeenCalledWith('settings/section/token', {
        event: 'onChangeText',
        payload: tokenValue,
      }),
    );
    await expect(field).toHaveValue(tokenValue);
    await expect(canvas.queryByText(tokenValue)).not.toBeInTheDocument();
  },
};
