import { WireNode } from '@repo/contracts/plugins/wire';
import fixture from '@repo/mocks/plugins/overlays.json' with { type: 'json' };
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn, waitFor, within } from 'storybook/test';
import { PluginTree } from './plugin-registry';

const root = WireNode.parse(fixture);

const onEvent = fn();

const meta = {
  title: 'Tests/Plugin overlays',
  render: (): React.JSX.Element => <PluginTree root={root} onEvent={onEvent} />,
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const ConfirmAndDismiss: Story = {
  play: async ({ canvas, userEvent }) => {
    const page = within(document.body);

    for (const kind of ['alert', 'dialog', 'sheet']) {
      await userEvent.click(
        canvas.getByRole('button', { name: `Open ${kind}` }),
      );
      await userEvent.click(
        await page.findByRole('button', { name: `Apply ${kind}` }),
      );
      await waitFor(() =>
        expect(
          page.queryByRole('button', { name: `Apply ${kind}` }),
        ).toBeNull(),
      );
      await expect(onEvent).toHaveBeenCalledWith(`overlays/${kind}-trigger`, {
        event: 'onAction',
        payload: { path: ['onPress', 'onConfirm'] },
      });
      await userEvent.click(
        canvas.getByRole('button', { name: `Open ${kind}` }),
      );
      await userEvent.click(
        await page.findByRole('button', { name: `Cancel ${kind}` }),
      );
      await waitFor(() =>
        expect(
          page.queryByRole('button', { name: `Cancel ${kind}` }),
        ).toBeNull(),
      );
      await expect(onEvent).toHaveBeenCalledWith(`overlays/${kind}-trigger`, {
        event: 'onAction',
        payload: { path: ['onPress', 'onDismiss'] },
      });
    }

    await expect(onEvent).toHaveBeenCalledTimes(6);
  },
};

export const DraftAndAcknowledgement: Story = {
  play: async ({ canvas, userEvent }) => {
    const page = within(document.body);
    await userEvent.click(canvas.getByRole('button', { name: 'Open dialog' }));
    const field = await page.findByRole('textbox', { name: 'Overlay name' });
    await userEvent.clear(field);
    await userEvent.type(field, 'Atlas');
    await waitFor(() =>
      expect(onEvent).toHaveBeenCalledWith('overlays/dialog-trigger', {
        event: 'onAction',
        payload: {
          path: [
            'onPress',
            'content',
            'children',
            '0',
            'props',
            'onChangeText',
          ],
          value: 'Atlas',
        },
      }),
    );
    const answer = Promise.withResolvers<void>();
    onEvent.mockReturnValueOnce(answer.promise);
    const apply = page.getByRole('button', { name: 'Apply dialog' });
    await userEvent.click(apply);
    await expect(apply).toHaveAttribute('aria-busy', 'true');
    answer.reject(new Error('Refused'));
    await waitFor(() => expect(apply).toHaveAttribute('aria-busy', 'false'));
    await expect(field).toHaveValue('Atlas');
    await userEvent.click(apply);
    await waitFor(() =>
      expect(page.queryByRole('textbox', { name: 'Overlay name' })).toBeNull(),
    );
  },
};

export const DismissAction: Story = {
  play: async ({ canvas, userEvent }) => {
    const page = within(document.body);
    await userEvent.click(canvas.getByRole('button', { name: 'Open sheet' }));
    await userEvent.click(
      await page.findByRole('button', { name: 'Close from content' }),
    );
    await waitFor(() => expect(page.queryByText('Sheet title')).toBeNull());
    await expect(onEvent).toHaveBeenCalledWith('overlays/sheet-trigger', {
      event: 'onAction',
      payload: { path: ['onPress', 'onDismiss'] },
    });
  },
};
