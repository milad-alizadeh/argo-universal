import fixtures from '@repo/mocks/plugins/svg.json' with { type: 'json' };
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { kitArgTypes } from '#kit/kit-arg-types';
import { Svg } from './svg';

const svgXml = firstFixtureXml();

function firstFixtureXml(): string {
  const fixture = fixtures.valid[0];

  if (!fixture) throw new Error('Missing valid SVG fixture');

  return fixture.xml;
}

const meta = {
  title: 'Design System/Primitives/Visual/Svg',
  component: Svg,
  args: { xml: svgXml, label: 'Service map' },
  argTypes: kitArgTypes('Svg'),
} satisfies Meta<typeof Svg>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Info: Story = { args: { tone: 'info' } };

export const DrawingUnavailable: Story = {
  args: { xml: '<svg><path></svg>' },
  parameters: {
    docs: {
      description: {
        story: 'Markup the renderer cannot draw falls back to the label.',
      },
    },
  },
};
