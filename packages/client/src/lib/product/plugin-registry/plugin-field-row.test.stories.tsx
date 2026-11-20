import type { PageEvent } from '@repo/contracts/plugins/page-calls';
import { WireNode } from '@repo/contracts/plugins/wire';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fireEvent, fn, waitFor } from 'storybook/test';
import { PluginTree } from './plugin-registry';

const meta = {
  title: 'Tests/Design System/Patterns/PluginRegistry/FieldRow',
  render: (): React.JSX.Element => (
    <PluginTree root={form} onPageCall={onPageCall} />
  ),
  beforeEach: () => {
    onPageCall.mockClear();
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

const node = (
  type: string,
  key: string,
  props: WireNode['props'],
  children: WireNode[] = [],
): WireNode => ({ type, key, props, children, slots: {} });

const warm = '#FFB45A';

// A light's row as a Plugin sends it: a dot, a name and a switch on one line, its brightness under them.
const lightRow = node('FieldGroup.Row', 'light', { id: 'desk' }, [
  node('Stack', 'rows', { direction: 'column', gap: 3 }, [
    node('Stack', 'head', { direction: 'row', gap: 3, align: 'center' }, [
      node('Swatch', 'dot', { colors: [warm], accessibilityLabel: 'Warm' }),
      node('Text', 'name', { children: 'Desk lamp', role: 'row' }),
      node('Switch', 'power', {
        value: true,
        accessibilityLabel: 'Desk lamp power',
        onValueChange: { bind: 'on' },
      }),
    ]),
    node('Slider', 'level', {
      value: 80,
      minimumValue: 1,
      maximumValue: 100,
      step: 1,
      accessibilityLabel: 'Desk lamp brightness',
      valueLabel: '80%',
      fill: [warm],
      onValueChange: { bind: 'level' },
    }),
  ]),
]);

const form = WireNode.parse(
  node('FieldGroup', 'form', {}, [
    node('FieldGroup.Section', 'section', { title: 'Office' }, [lightRow]),
  ]),
);

const onPageCall = fn(async () => {});

// What an event sent, from the node it came from; a row's children keep their path under it.
const from = (key: string, payload: boolean | number): PageEvent =>
  expect.objectContaining({ key, payload });

export const SwitchInsideRowDispatches: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(
      canvas.getByRole('switch', { name: 'Desk lamp power' }),
    );
    await expect(onPageCall).toHaveBeenCalledWith(
      { bind: 'on' },
      from('form/section/light/rows/head/power', false),
    );
  },
};

export const SliderInsideRowDispatches: Story = {
  play: async ({ canvas }) => {
    const slider = canvas.getByRole('slider', {
      name: 'Desk lamp brightness',
    });
    await fireEvent.change(slider, { target: { value: '35' } });
    await waitFor(() =>
      expect(onPageCall).toHaveBeenCalledWith(
        { bind: 'level' },
        from('form/section/light/rows/level', 35),
      ),
    );
  },
};

export const RowDrawsItsText: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Desk lamp')).toBeVisible();
    await expect(canvas.getByRole('img', { name: 'Warm' })).toBeVisible();
  },
};
