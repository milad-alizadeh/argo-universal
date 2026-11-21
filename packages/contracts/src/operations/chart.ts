import { z } from 'zod';
import { tones } from '../kit-tokens';
import { chartProps } from '../plugins/visual-props';
import type { OperationDefinition } from './index';

const example = [
  '```chart',
  '{"kind":"line","label":"Weekly deliveries","series":[{"name":"Delivered","tone":"info","points":[{"x":1,"y":12},{"x":2,"y":19}]}]}',
  '```',
].join('\n');

const ChartPreviewInput = z.strictObject({
  fence: z.string().meta({
    description:
      'Supply one complete chart fence, including the opening and closing markers, with strict JSON inside. ' +
      `Set kind to one of ${chartProps.shape.kind.options.join(', ')} and give the Chart a label of 1 to 120 characters. ` +
      'Use series for up to 8 named series. Each series has a name of 1 to 120 characters, a distinct tone, and up to 2000 points. ' +
      `The available tones are ${tones.join(', ')}. Each point has finite numeric x and y values. Each x must be unique within its series. ` +
      'The optional stacked and grid fields are booleans. Omit action fields.',
    examples: [example],
  }),
});

const ChartPreviewResult = z.discriminatedUnion('valid', [
  z.strictObject({
    valid: z.literal(false),
    problems: z.array(
      z.strictObject({
        path: z.array(z.union([z.string(), z.number().int().nonnegative()])),
        message: z.string(),
      }),
    ),
  }),
  z.strictObject({
    valid: z.literal(true),
    status: z.literal('unavailable'),
    reason: z.string(),
  }),
]);

export const chartOperations = {
  'chart.preview': {
    id: 'chart.preview',
    label: 'Preview Chart',
    icon: 'diagram',
    description:
      'Preview the exact Chart fence before sending it in an Agent message. Correct any reported field errors before sending.',
    params: ChartPreviewInput,
    result: ChartPreviewResult,
    tier: 'read',
    policy: 'allow',
    keywords: ['chart', 'plot', 'validate', 'preview', 'fence'],
  },
} as const satisfies Record<string, OperationDefinition>;
