import { z } from 'zod';
import { part, stringLabel } from '../plugin-part-schema-utils';
import { wireParts } from '../wire-parts';

export const visualPartSchemas = {
  Svg: wireParts.Svg,
  Chart: part(
    'A bounded data visualization.',
    z.object({
      data: z.array(z.record(z.string(), z.number())),
      accessibilityLabel: stringLabel,
    }),
    { label: 'The required `accessibilityLabel` summarizes the chart data.' },
  ),
};
