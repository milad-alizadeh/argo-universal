import { serviceMapXml } from '../../../../mocks/service-map-svg';
import type { SvgProps } from './svg';

export const infoSvg = {
  xml: serviceMapXml,
  label: 'Service map',
  tone: 'info',
} satisfies SvgProps;

export const drawingUnavailableSvg = {
  xml: '<svg><path></svg>',
  label: 'Service map',
} satisfies SvgProps;
