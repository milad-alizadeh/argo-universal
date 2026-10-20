import { z } from 'zod';
import { tones } from '../kit-tokens';
import { svgProps } from './kit-props';
import { svgCharacterLimit } from './wire-limits';

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

export const chartProps = z.strictObject({
  kind: z.enum(['line', 'bar', 'area', 'scatter', 'pie', 'donut']),
  label,
  stacked: z.boolean().optional(),
  onPress: svgProps.shape.onPress,
  series: z
    .array(series)
    .max(seriesLimit)
    .refine(distinctTones, 'series must use distinct tones'),
});

export const canvasProps = z.strictObject({
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

export const visualDataProps = {
  Chart: chartProps,
  Canvas: canvasProps,
  'Canvas.Rect': drawing.extend({
    ...xy,
    width: number.nonnegative(),
    height: number.nonnegative(),
    rx: number.nonnegative().optional(),
    ry: number.nonnegative().optional(),
  }),
  'Canvas.Circle': drawing.extend({
    cx: number,
    cy: number,
    r: number.nonnegative(),
  }),
  'Canvas.Line': drawing.extend({
    x1: number,
    y1: number,
    x2: number,
    y2: number,
  }),
  'Canvas.Path': drawing.extend({ d: z.string().max(svgCharacterLimit) }),
  'Canvas.Text': drawing.extend({ ...xy, text: z.string() }),
  'Canvas.Group': drawing.partial().extend({
    translate: z.tuple([number, number]).optional(),
    scale: transform,
    rotate: number.optional(),
  }),
};

export const visualSchemas = new Map<string, z.ZodObject>(
  Object.entries({ Svg: svgProps.strict(), ...visualDataProps }),
);

function distinctTones(data: z.output<typeof series>[]): boolean {
  return new Set(data.map((item) => item.tone)).size === data.length;
}
