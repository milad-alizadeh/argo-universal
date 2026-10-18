import { tones } from '@repo/contracts/kit-tokens';
import { svgProps } from '@repo/contracts/plugins/kit';
import type { WireNode } from '@repo/contracts/plugins/wire';
import { z } from 'zod';
import { svgCharacterLimit } from './svg-types';

const labelLimit = 120;

const pointLimit = 2000;

const seriesLimit = 8;

const number = z.number().finite();

const label = z.string().min(1).max(labelLimit);

const point = z.strictObject({ x: number, y: number });

const series = z.strictObject({
  name: label,
  tone: z.enum(tones),
  points: z.array(point).max(pointLimit),
});

const chart = z.strictObject({
  kind: z.enum(['line', 'bar', 'area', 'scatter', 'pie', 'donut']),
  label,
  stacked: z.boolean().optional(),
  onPress: svgProps.shape.onPress,
  series: z.array(series).max(seriesLimit),
});

const canvas = z.strictObject({
  label,
  width: number.positive(),
  height: number.positive(),
  aspectRatio: number.positive().optional(),
  camera: z.enum(['fixed', 'pan-zoom']),
  selectedKey: z.string().optional(),
});

const drawing = z.strictObject({
  tone: z.enum(tones),
  intensity: number.min(0).max(1).optional(),
  fill: z.boolean().optional(),
  stroke: z.boolean().optional(),
  strokeWidth: number.nonnegative().optional(),
  label: label.optional(),
  onPress: svgProps.shape.onPress,
});

const xy = { x: number.optional(), y: number.optional() };

const transform = z.union([number, z.tuple([number, number])]).optional();

export const visualSchemas = new Map<string, z.ZodObject>([
  ['Svg', svgProps.extend({ xml: z.string() }).strict()],
  ['Chart', chart],
  ['Canvas', canvas],
  [
    'Canvas.Rect',
    drawing.extend({
      ...xy,
      width: number.nonnegative(),
      height: number.nonnegative(),
      rx: number.nonnegative().optional(),
      ry: number.nonnegative().optional(),
    }),
  ],
  [
    'Canvas.Circle',
    drawing.extend({ cx: number, cy: number, r: number.nonnegative() }),
  ],
  [
    'Canvas.Line',
    drawing.extend({ x1: number, y1: number, x2: number, y2: number }),
  ],
  ['Canvas.Path', drawing.extend({ d: z.string().max(svgCharacterLimit) })],
  ['Canvas.Text', drawing.extend({ ...xy, text: z.string() })],
  [
    'Canvas.Group',
    drawing.partial().extend({
      translate: z.tuple([number, number]).optional(),
      scale: transform,
      rotate: number.optional(),
    }),
  ],
]);

export function visualPropsReason(
  type: string,
  props: WireNode['props'],
  partial?: boolean,
): string | undefined {
  const schema = visualSchemas.get(type);

  if (!schema) return;

  return parseProps(type, props, partial ? schema.partial() : schema);
}

function parseProps(
  type: string,
  props: WireNode['props'],
  schema: z.ZodObject,
): string | undefined {
  const result = schema.safeParse(props);

  return result.success
    ? chartToneReason(type, props)
    : propErrors(result.error);
}

function propErrors(error: z.ZodError): string {
  return error.issues
    .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
    .join('; ');
}

function chartToneReason(
  type: string,
  props: WireNode['props'],
): string | undefined {
  if (type !== 'Chart') return;
  const parsed = z.array(series).safeParse(props.series);

  if (!parsed.success) return;

  return distinctTones(parsed.data);
}

function distinctTones(data: z.output<typeof series>[]): string | undefined {
  const tones = data.map((item) => item.tone);

  return new Set(tones).size === tones.length
    ? undefined
    : 'series must use distinct tones';
}
