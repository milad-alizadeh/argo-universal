import type { MadePageCall } from '@repo/contracts/plugins/page-call-payload';
import { WireNode } from '@repo/contracts/plugins/wire';
import { applyPatch } from '@repo/contracts/plugins/wire-patch';
import overlays from '@repo/mocks/plugins/overlays.json' with { type: 'json' };
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn, waitFor, within, fireEvent } from 'storybook/test';
import { PluginTree, type OnPageCall } from './plugin-registry';
import { textFieldNode } from './plugin-registry-fixtures';

// The Operation's answer; an edit's call answers at once.
let answer = Promise.withResolvers<void>();

const onPageCall = fn<OnPageCall>((call) =>
  'operation' in call ? answer.promise : Promise.resolve(),
);

const meta = {
  title: 'Tests/Design System/Patterns/PluginRegistry/SubmitAck',
  beforeEach: (): void => {
    answer = Promise.withResolvers<void>();
    onPageCall.mockClear();
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

const textField = {
  root: textFieldNode(),
  name: 'Project name',
  key: 'textinput',
};

const sheetField = {
  root: applyPatch(WireNode.parse(overlays), [
    { op: 'setProps', key: ['sheet'], props: { open: true } },
  ]),
  name: 'Overlay name',
  key: 'overlays/sheet/body/field/section/name',
};

type Row = {
  field: typeof textField;
  // The named button confirms; without one, Return submits the field.
  confirm?: string;
  sent: { call: MadePageCall; key: string };
};

/*
 * A Submit or confirming press runs its Operation after the edit before it, and its control is held
 * until the Operation answers. A Loader page lands the edit before the run (`PageCalls`).
 */
function waitsForOperation(row: Row): Story {
  return {
    render: () => <PluginTree root={row.field.root} onPageCall={onPageCall} />,
    play: async ({ userEvent }) => {
      const page = within(document.body);
      const input = await page.findByRole('textbox', { name: row.field.name });
      await fireEvent.change(input, { target: { value: 'Atlas' } });
      await waitFor(() =>
        expect(onPageCall).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({ key: row.field.key, payload: 'Atlas' }),
        ),
      );

      const control = row.confirm
        ? page.getByRole('button', { name: row.confirm })
        : input;

      await (row.confirm
        ? userEvent.click(control)
        : userEvent.type(input, '{Enter}'));
      await waitFor(() =>
        expect(onPageCall).toHaveBeenLastCalledWith(
          row.sent.call,
          expect.objectContaining({ key: row.sent.key }),
        ),
      );
      await expect(control).toBeDisabled();
      answer.resolve();
      await waitFor(() => expect(control).toBeEnabled());
    },
  };
}

export const SubmitWaitsForItsOperation = waitsForOperation({
  field: textField,
  sent: {
    call: { operation: 'saveProject', args: {} },
    key: 'textinput',
  },
});

export const ConfirmWaitsForItsOperation = waitsForOperation({
  field: sheetField,
  confirm: 'Apply sheet',
  sent: {
    call: { operation: 'rename', args: {} },
    key: 'overlays/sheet/body/apply',
  },
});
