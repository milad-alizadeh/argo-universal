import { part } from '../plugin-part-schema-utils';
import { visualDataProps } from '../visual-props';

export const visualPartSchemas = {
  Chart: part('A bounded data visualization.', visualDataProps.Chart, {
    group: 'visual',
    wire: false,
  }),
};
