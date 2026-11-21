import { z } from 'zod';
import { tones } from '../kit-tokens';
import {
  chartLimits,
  chartProps,
  visualLabelLength,
} from '../plugins/visual-props';
import type { OperationDefinition } from './index';

const example = [
  '```chart',
  '{"kind":"line","label":"Weekly deliveries","series":[{"name":"Delivered","tone":"info","points":[{"x":1,"y":12},{"x":2,"y":19}]}]}',
  '```',
].join('\n');

export const defaultChartPreviewWidth = 390;

export const defaultChartPreviewTheme = 'light';

const minimumContentWidth = 240;

const maximumContentWidth = 1200;

const maximumBase64Length = 4_194_304;

const ChartPreviewWidth = z
  .number()
  .int()
  .min(minimumContentWidth)
  .max(maximumContentWidth);

const ChartPreviewTheme = z.enum(['light', 'dark']);

export const ChartPreviewDraft = z.strictObject({
  fence: z.string(),
  width: ChartPreviewWidth,
  theme: ChartPreviewTheme,
});

export type ChartPreviewDraft = z.infer<typeof ChartPreviewDraft>;

export const chartPreviewFragment = '#argo-chart-preview';

export const chartPreviewRendererKey = 'argoChartPreview';

export const ChartPreviewBounds = z.strictObject({
  x: z.number().int().nonnegative(),
  y: z.number().int().nonnegative(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
});

export type ChartPreviewBounds = z.infer<typeof ChartPreviewBounds>;

export interface ChartPreviewRenderer {
  draw(draft: ChartPreviewDraft): Promise<ChartPreviewBounds | null>;
}

const ChartPreviewImage = z.strictObject({
  mimeType: z.literal('image/png'),
  data: z.base64().min(1).max(maximumBase64Length),
});

const ChartPreviewUnavailable = z.strictObject({
  status: z.literal('unavailable'),
  reason: z.string(),
});

const ChartPreviewCaptured = z.strictObject({
  status: z.literal('captured'),
  image: ChartPreviewImage,
});

export const ChartPreviewAnswer = z.discriminatedUnion('status', [
  ChartPreviewUnavailable,
  ChartPreviewCaptured,
]);

export type ChartPreviewAnswer = z.infer<typeof ChartPreviewAnswer>;

export const ChartPreviewRequest = z.discriminatedUnion('type', [
  z.strictObject({ type: z.literal('ready') }),
  z.strictObject({
    type: z.literal('capture'),
    requestId: z.string(),
    draft: ChartPreviewDraft,
  }),
]);

export type ChartPreviewRequest = z.infer<typeof ChartPreviewRequest>;

export const ChartPreviewReply = z.strictObject({
  requestId: z.string(),
  answer: ChartPreviewAnswer,
});

export type ChartPreviewReply = z.infer<typeof ChartPreviewReply>;

const ChartPreviewInput = z.strictObject({
  fence: z.string().meta({
    description:
      'Supply one complete chart fence, including the opening and closing markers, with strict JSON inside. ' +
      `Set kind to one of ${chartProps.shape.kind.options.join(', ')} and give the Chart a label of ${visualLabelLength.minimum} to ${visualLabelLength.maximum} characters. ` +
      `Use series for up to ${chartLimits.series} named series. Each series has a name of ${visualLabelLength.minimum} to ${visualLabelLength.maximum} characters, a distinct tone, and up to ${chartLimits.pointsPerSeries} points. ` +
      `The available tones are ${tones.join(', ')}. Each point has finite numeric x and y values. Each x must be unique within its series. ` +
      'The optional stacked and grid fields are booleans. Omit action fields.',
    examples: [example],
  }),
  width: ChartPreviewWidth.optional().describe(
    `Feed content width in CSS pixels. Defaults to ${defaultChartPreviewWidth}.`,
  ),
  theme: ChartPreviewTheme.optional().describe(
    `Web theme for the preview. Defaults to ${defaultChartPreviewTheme}.`,
  ),
});

export const ChartPreviewCapturedResult = ChartPreviewCaptured.extend({
  valid: z.literal(true),
  platform: z.literal('web'),
  width: ChartPreviewWidth,
  theme: ChartPreviewTheme,
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
  z.discriminatedUnion('status', [
    ChartPreviewUnavailable.extend({ valid: z.literal(true) }),
    ChartPreviewCapturedResult,
  ]),
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
