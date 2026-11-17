import { serviceMapXml } from '../../../../mocks/service-map-svg';
import type { SvgProps } from './svg';

const label = 'Service map';

const tone = 'info';

export const infoSvg = {
  xml: serviceMapXml,
  label,
  tone,
} satisfies SvgProps;

export const drawingUnavailableSvg = {
  xml: '<svg><path></svg>',
  label,
} satisfies SvgProps;

export const sizedSvg = {
  xml: serviceMapXml,
  label,
  tone,
  width: 64,
} satisfies SvgProps;
