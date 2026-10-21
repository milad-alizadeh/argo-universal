import fixtures from '@repo/mocks/plugins/svg.json' with { type: 'json' };
import type { SvgProps } from './svg';

export const serviceMapXml = firstFixtureXml();

export const infoSvg = {
  xml: serviceMapXml,
  label: 'Service map',
  tone: 'info',
} satisfies SvgProps;

export const drawingUnavailableSvg = {
  xml: '<svg><path></svg>',
  label: 'Service map',
} satisfies SvgProps;

function firstFixtureXml(): string {
  const fixture = fixtures.valid[0];

  if (!fixture) throw new Error('Missing valid SVG fixture');

  return fixture.xml;
}
