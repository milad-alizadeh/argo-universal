import { part } from '../plugin-part-schema-utils';
import { visualDataProps } from '../visual-props';
import { wireParts } from '../wire-parts';

export const visualPartSchemas = {
  Svg: wireParts.Svg,
  Chart: part('A bounded data visualization.', visualDataProps.Chart),
};
