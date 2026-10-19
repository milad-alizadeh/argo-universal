import { part } from '../plugin-part-schema-utils';
import { visualDataProps } from '../visual-props';
import { wireParts } from '../wire-parts';

export const visualPartSchemas = {
  Svg: wireParts.Svg,
  Chart: part('A bounded data visualization.', visualDataProps.Chart),
  Canvas: part('A bounded scene of keyed shapes.', visualDataProps.Canvas, {
    children: true,
  }),
  'Canvas.Rect': part('A Canvas rectangle.', visualDataProps['Canvas.Rect']),
  'Canvas.Circle': part('A Canvas circle.', visualDataProps['Canvas.Circle']),
  'Canvas.Line': part('A Canvas line.', visualDataProps['Canvas.Line']),
  'Canvas.Path': part('A Canvas path.', visualDataProps['Canvas.Path']),
  'Canvas.Text': part(
    'Canvas text in the system font.',
    visualDataProps['Canvas.Text'],
  ),
  'Canvas.Group': part(
    'A transformed group of Canvas shapes.',
    visualDataProps['Canvas.Group'],
    { children: true },
  ),
};
