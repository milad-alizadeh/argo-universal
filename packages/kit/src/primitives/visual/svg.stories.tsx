import fixtures from '@repo/mocks/plugins/svg.json' with { type: 'json' };
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { kitArgTypes } from '#kit/kit-arg-types';
import { Variation, Variations as VariationList } from '../../variations';
import { Svg } from './svg';

const meta = {
  title: 'Design System/Primitives/Visual/Svg',
  component: Svg,
  argTypes: kitArgTypes('Svg'),
} satisfies Meta;

export default meta;

type Story = StoryObj;

const svgXml = firstFixtureXml();

function firstFixtureXml(): string {
  const fixture = fixtures.valid[0];

  if (!fixture) throw new Error('Missing valid SVG fixture');

  return fixture.xml;
}

export const Variations: Story = {
  name: 'Svg',
  render: () => (
    <VariationList>
      <Variation label="Info tone">
        <Svg xml={svgXml} label="Service map" tone="info" />
      </Variation>
      <Variation label="Drawing unavailable">
        <Svg xml="<svg><path></svg>" label="Service map" />
      </Variation>
    </VariationList>
  ),
};
