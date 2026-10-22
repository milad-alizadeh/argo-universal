import { WireNode } from '@repo/contracts/plugins/wire';
import { applyPatch } from '@repo/contracts/plugins/wire-patch';
import fixture from '@repo/mocks/plugins/overlays.json' with { type: 'json' };
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState } from 'react';
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

const apply = { name: 'Apply alert' };

const cancel = { name: 'Cancel alert' };

const meta = {
  title: 'Tests/Design System/Patterns/PluginRegistry/Overlays',
  args: { overlay: 'sheet' },
  render: ({ overlay }): React.JSX.Element => (
    <PluginTree root={roots[overlay]} onEvent={onEvent} />
  ),
} satisfies Meta<{ overlay: keyof typeof roots }>;

export default meta;

type Story = StoryObj<typeof meta>;

// The answer reaches the Plugin before the close, which may remove the Alert and its Actions.
export const AlertAnswer: Story = {
  args: { overlay: 'alert' },
  play: async ({ userEvent }) => {
    const page = within(document.body);
    await userEvent.click(await page.findByRole('button', apply));
    await waitFor(() => expect(page.queryByRole('button', apply)).toBeNull());
    await waitFor(() =>
      expect(onEvent.mock.calls).toEqual([
        ['overlays/alert/apply', { event: 'onPress' }],
        ['overlays/alert', { event: 'onOpenChange', payload: false }],
      ]),
    );
  },
};

// The Plugin declares Apply first; its `role: 'cancel'` Action is the alert's Cancel, which the web reads first.
export const AlertCancelRole: Story = {
  args: { overlay: 'alert' },
  play: async ({ userEvent }) => {
    const alert = await within(document.body).findByRole('dialog', {
      name: 'Alert title',
    });

    const answers = within(alert).getAllByRole('button');
    await expect(answers.map((answer) => answer.textContent)).toEqual([
      cancel.name,
      apply.name,
    ]);

    await userEvent.click(within(alert).getByRole('button', cancel));
    await waitFor(() =>
      expect(onEvent.mock.calls).toEqual([
        ['overlays/alert/cancel', { event: 'onPress' }],
        ['overlays/alert', { event: 'onOpenChange', payload: false }],
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

const applySheet = { name: 'Apply sheet' };

export const ConfirmAcknowledgement: Story = {
  play: async ({ userEvent }) => {
    const page = within(document.body);
    const answer = Promise.withResolvers<void>();
    onEvent.mockReturnValueOnce(answer.promise);
    const confirm = await page.findByRole('button', applySheet);
    await userEvent.click(confirm);
    await expect(confirm).toHaveAttribute('aria-busy', 'true');
    answer.reject(new Error('Refused'));
    await waitFor(() => expect(confirm).toHaveAttribute('aria-busy', 'false'));
  },
};

const delivered = fn();

// The press goes through the delivery current when it is sent, not the one the sheet first rendered with.
function UpdatedDelivery(): React.JSX.Element {
  const [revision, update] = useState(1);

  return (
    <PluginTree
      root={roots.sheet}
      onEvent={(key, event) => {
        delivered(revision, key, event);
        update(2);
      }}
    />
  );
}

export const CurrentDeliveryAfterEdit: Story = {
  render: UpdatedDelivery,
  play: async ({ userEvent }) => {
    const page = within(document.body);
    const input = await page.findByRole('textbox', { name: fieldName });
    await userEvent.type(input, 'Atlas');
    await waitFor(() => expect(delivered).toHaveBeenCalled());
    await userEvent.click(page.getByRole('button', applySheet));
    await waitFor(() =>
      expect(delivered).toHaveBeenLastCalledWith(
        2,
        'overlays/sheet/body/apply',
        { event: 'onPress' },
      ),
    );
  },
};
