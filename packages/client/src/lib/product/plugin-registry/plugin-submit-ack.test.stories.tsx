import { WireNode, type PartEvent } from '@repo/contracts/plugins/wire';
import { applyPatch } from '@repo/contracts/plugins/wire-patch';
import controls from '@repo/mocks/plugins/controls.json' with { type: 'json' };
import overlays from '@repo/mocks/plugins/overlays.json' with { type: 'json' };
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn, waitFor, within, fireEvent } from 'storybook/test';
import { PluginTree } from './plugin-registry';

const onEvent = fn();

const meta = {
  title: 'Tests/Design System/Patterns/PluginRegistry/SubmitAck',
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

const textField = {
  root: WireNode.parse(controls.find((node) => node.type === 'TextInput')),
  name: 'Project name',
  key: 'textinput',
};

const sheetField = {
  root: applyPatch(WireNode.parse(overlays), [
    { op: 'setProps', key: ['sheet'], props: { open: true } },
  ]),
  name: 'Overlay name',
  key: 'overlays/sheet/body/field',
};

type Row = {
  field: typeof textField;
  // The edit has reached the Plugin and is still running, or is still queued.
  running: boolean;
  // The named button confirms; without one, Return submits the field.
  confirm?: string;
  sent: [string, PartEvent];
};

// A Submit or confirming press reaches the Plugin only after the edit before it settles.
function waitsForEdit(row: Row): Story {
  return {
    render: () => <PluginTree root={row.field.root} onEvent={onEvent} />,
    play: async ({ userEvent }) => {
      const page = within(document.body);
      const answer = Promise.withResolvers<void>();
      onEvent.mockReturnValueOnce(answer.promise);
      const input = await page.findByRole('textbox', { name: row.field.name });
      await fireEvent.change(input, { target: { value: 'Atlas' } });

      if (row.running)
        await waitFor(() => expect(onEvent).toHaveBeenCalledOnce());

      await (row.confirm
        ? userEvent.click(page.getByRole('button', { name: row.confirm }))
        : userEvent.type(input, '{Enter}'));
      await waitFor(() => expect(onEvent).toHaveBeenCalledOnce());
      await expect(onEvent).toHaveBeenCalledWith(row.field.key, {
        event: 'onChangeText',
        payload: 'Atlas',
      });
      answer.resolve();
      await waitFor(() => expect(onEvent).toHaveBeenCalledTimes(2));
      await expect(onEvent).toHaveBeenLastCalledWith(...row.sent);
    },
  };
}

export const SubmitWaitsForEdit = waitsForEdit({
  field: textField,
  running: false,
  sent: ['textinput', { event: 'onSubmit' }],
});

const applySheet = {
  field: sheetField,
  confirm: 'Apply sheet',
  sent: ['overlays/sheet/body/apply', { event: 'onPress' }],
} satisfies Omit<Row, 'running'>;

export const ConfirmSendsQueuedEdit = waitsForEdit({
  ...applySheet,
  running: false,
});

export const ConfirmWaitsForRunningEdit = waitsForEdit({
  ...applySheet,
  running: true,
});
