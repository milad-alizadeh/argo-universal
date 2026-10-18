import { z } from 'zod';
import { part, stringLabel, optionalLabel } from '../plugin-part-schema-utils';

export const visualPartSchemas = {
  Svg: part(
    'A sanitized SVG visual with bounded dimensions.',
    z.object({ source: z.string(), accessibilityLabel: optionalLabel }),
    {
      appearance:
        'SVG is cleaned by the Server; colors follow the visual contract and do not accept arbitrary Plugin color declarations.',
    },
  ),
  Chart: part(
    'A bounded data visualization.',
    z.object({
      data: z.array(z.record(z.string(), z.number())),
      accessibilityLabel: stringLabel,
    }),
    { label: 'The required `accessibilityLabel` summarizes the chart data.' },
  ),
  CodeMap: part(
    'A bounded code map visual.',
    z.object({ source: z.string(), accessibilityLabel: stringLabel }),
    { label: 'The required `accessibilityLabel` summarizes the code map.' },
  ),
};
