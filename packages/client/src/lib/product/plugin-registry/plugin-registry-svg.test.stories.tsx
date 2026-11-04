import svgFixtures from '@repo/mocks/plugins/svg.json' with { type: 'json' };
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn } from 'storybook/test';
import { PluginTree } from './plugin-registry';

const onPageCall = fn(async () => {});

const label = 'Service map';

const xml = firstSvgXml();

function firstSvgXml(): string {
  const fixture = svgFixtures.valid[0];

  if (!fixture) throw new Error('Missing valid SVG fixture');

  return fixture.xml;
}

const meta = {
  title: 'Tests/Design System/Patterns/PluginRegistry/Svg',
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const Press: Story = {
  render: () => (
    <PluginTree
      root={{
        type: 'Svg',
        key: '0',
        props: { xml, label, onPress: { operation: 'openMap', args: {} } },
        children: [],
        slots: {},
      }}
      onPageCall={onPageCall}
    />
  ),
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: label }));
    await expect(onPageCall).toHaveBeenCalledWith(
      { operation: 'openMap', args: {} },
      expect.objectContaining({ key: '0', name: 'onPress' }),
    );
  },
};

export const Fallback: Story = {
  render: () => (
    <PluginTree
      root={{
        type: 'Svg',
        key: '0',
        props: { xml: '<svg><path></svg>', label },
        children: [],
        slots: {},
      }}
    />
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByText(label)).toBeVisible();
  },
};
