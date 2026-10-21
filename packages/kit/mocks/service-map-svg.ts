import fixtures from '@repo/mocks/plugins/svg.json' with { type: 'json' };

// The first valid Plugin SVG, which the Svg and Card stories both draw.
export const serviceMapXml = firstFixtureXml();

function firstFixtureXml(): string {
  const fixture = fixtures.valid[0];

  if (!fixture) throw new Error('Missing valid SVG fixture');

  return fixture.xml;
}
