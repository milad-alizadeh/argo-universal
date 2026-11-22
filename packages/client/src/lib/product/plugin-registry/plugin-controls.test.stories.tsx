import type { PageEvent } from '@repo/contracts/plugins/page-calls';
import { WireNode, type WireJson } from '@repo/contracts/plugins/wire';
import { settleLayout } from '@repo/kit/mocks/story-layout';
import fixtures from '@repo/mocks/plugins/controls.json' with { type: 'json' };
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn, waitFor, within, fireEvent } from 'storybook/test';
import { PluginTree } from './plugin-registry';

const meta = {
  title: 'Tests/Design System/Patterns/PluginRegistry/Controls',
  render: (): React.JSX.Element => (
    <>
      {roots.map((root) => (
        <PluginTree key={root.key} root={root} onPageCall={onPageCall} />
      ))}
    </>
  ),
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

const onPageCall = fn(async () => {});

// What a control's event sent, from the node it came from.
const from = (key: string, payload?: WireJson): PageEvent =>
  expect.objectContaining(payload === undefined ? { key } : { key, payload });

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
      onPageCall.mockReturnValueOnce(answer.promise);
      const control = canvas.getByRole(role, { name });
      await userEvent.click(canvas.getByText(name));
      await expect(control).toBeChecked();
      await expect(control).toBeDisabled();
      await expect(onPageCall).toHaveBeenCalledWith(
        { bind: 'notifications' },
        from(key, true),
      );
      answer.reject(new Error('Handler failed'));
      await waitFor(() => expect(control).not.toBeChecked());
      await expect(control).not.toBeDisabled();
      const accepted = Promise.withResolvers<void>();
      onPageCall.mockReturnValueOnce(accepted.promise);
      await userEvent.click(canvas.getByText(name));
      await expect(control).toBeDisabled();
      accepted.resolve();
      await waitFor(() => expect(control).not.toBeDisabled());
      await expect(control).toBeChecked();
    }
  },
};

export const SelectPicker: Story = {
  beforeEach: (): Promise<void> => settleLayout('wide'),
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: environment }));
    await userEvent.click(
      await within(document.body).findByRole('option', { name: 'Production' }),
    );
    await expect(onPageCall).toHaveBeenCalledWith(
      { bind: 'environment' },
      from(pickerKey, 'prod'),
    );
  },
};

export const AdjustSlider: Story = {
  play: async ({ canvas }) => {
    const slider = canvas.getByRole('slider', { name: 'Concurrency' });
    await fireEvent.change(slider, { target: { value: '7' } });
    await waitFor(() =>
      expect(onPageCall).toHaveBeenCalledWith(
        { bind: 'concurrency' },
        from('slider', 7),
      ),
    );
  },
};

export const EditAndSubmitText: Story = {
  play: async ({ canvas, userEvent }) => {
    const field = canvas.getByRole('textbox', { name: 'Project name' });
    await userEvent.clear(field);
    await userEvent.type(field, 'Atlas');
    await waitFor(() =>
      expect(onPageCall).toHaveBeenCalledWith(
        { bind: 'projectName' },
        from(textKey, 'Atlas'),
      ),
    );
    await userEvent.type(field, '{Enter}');
    await expect(onPageCall).toHaveBeenCalledWith(
      { operation: 'saveProject', args: {} },
      from(textKey),
    );
  },
};

export const PressIconButton: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Add project' }));
    await expect(onPageCall).toHaveBeenCalledWith(
      { operation: 'addProject', args: {} },
      from('iconbutton'),
    );
  },
};

export const UseSplitButton: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: /^Deploy$/ }));
    await expect(onPageCall).toHaveBeenCalledWith(
      { operation: 'deploy', args: {} },
      from('splitbutton'),
    );
    await userEvent.click(
      canvas.getByRole('button', { name: 'More deployments' }),
    );
    await userEvent.click(
      within(document.body).getByRole('menuitem', { name: 'Deploy preview' }),
    );
    await expect(onPageCall).toHaveBeenCalledWith(
      { operation: 'deployPreview', args: {} },
      from('splitbutton/preview'),
    );
  },
};

// Answers that wait until the test lets them, as a Plugin's run still in flight does.
const heldCall = fn(() => new Promise<void>(() => {}));

const iconButton = (key: string, label: string, toggle: boolean): WireNode =>
  WireNode.parse({
    type: 'IconButton',
    key,
    props: {
      icon: 'power',
      accessibilityLabel: label,
      selected: false,
      onPress: { operation: 'setPower', args: { on: true } },
      ...(toggle && {
        onPressSelected: { operation: 'setPower', args: { on: false } },
      }),
    },
    slots: {},
    children: [],
  });

const toggleButton = iconButton('power', 'Desk power', true);

const plainButton = iconButton('add', 'Add light', false);

/*
 * A toggle's second press, made while the first one's run is still in flight, reaches the page: it is the person
 * switching back, which the page runs after the first. A plain IconButton still holds a second press back.
 */
export const ToggleTakesASecondPressWhileTheFirstRuns: Story = {
  render: () => (
    <>
      <PluginTree root={toggleButton} onPageCall={heldCall} />
      <PluginTree root={plainButton} onPageCall={heldCall} />
    </>
  ),
  play: async ({ canvas, userEvent }) => {
    heldCall.mockClear();
    const toggle = canvas.getByRole('button', { name: 'Desk power' });

    await userEvent.click(toggle);
    await userEvent.click(toggle);
    await waitFor(() => expect(heldCall).toHaveBeenCalledTimes(2));

    const plain = canvas.getByRole('button', { name: 'Add light' });

    await userEvent.click(plain);
    await expect(heldCall).toHaveBeenCalledTimes(3);
    await expect(plain).toBeDisabled();
    await expect(toggle).toBeEnabled();
  },
};
