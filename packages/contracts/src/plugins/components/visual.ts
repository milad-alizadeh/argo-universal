import { z } from 'zod';
import { colourStops } from '../colour-data';
import { svgProps } from '../core-kit-props';
import { defineKitComponent } from '../define-kit-component';
import { stringLabel } from '../kit-component-props';
import { visualDataProps } from '../visual-props';

const drawings = [
  'Canvas.Rect',
  'Canvas.Circle',
  'Canvas.Line',
  'Canvas.Path',
  'Canvas.Text',
  'Canvas.Group',
] as const;

const svgReader = 'Reads the label as an image or button, based on `onPress`.';

const swatchProps = z.object({
  colors: colourStops
    .optional()
    .describe(
      'The dot’s colours, which are data; left out, the dot is empty, as an off light’s.',
    ),
  accessibilityLabel: stringLabel.describe(
    'What the colour is, such as “Warm white”.',
  ),
});

export const visualComponents = {
  Swatch: defineKitComponent(
    'A round dot filled with a colour that is data, such as a light’s.',
    swatchProps,
    {
      group: 'visual',
      label: 'The accessibilityLabel says what the colour is.',
      appearance:
        'The dot draws its colours as a gradient with a soft glow, the same in light and dark mode; with no colours it is an empty muted dot.',
    },
  ),
  Svg: defineKitComponent(
    'Sanitized SVG artwork. Use Canvas for interactive drawing.',
    svgProps,
    {
      group: 'visual',
      accessibility: {
        label: 'Accessible name for the image or button.',
        keyboard:
          'Not focusable as an image; `onPress` enables button activation.',
        voiceOver: svgReader,
      },
      appearance:
        '`tone` sets semantic color; Server sanitizes markup and rejects unsupported SVG.',
    },
  ),
  Chart: defineKitComponent(
    'A bounded data visualization.',
    visualDataProps.Chart,
    {
      group: 'visual',
      label:
        'The required label names the chart; a hidden table lists every series. A series may not repeat an x value.',
      accessibility: {
        keyboard:
          'Not focusable as an image; `onPress` enables button activation.',
        voiceOver:
          'Reads the label as an image or button, then a table of each series and its points.',
      },
      appearance:
        'Each series takes one tone token. Axis and value labels are system Text over the chart. No automatic motion.',
    },
  ),
  Canvas: defineKitComponent(
    'A scene of keyed shapes laid out by the Plugin worker.',
    visualDataProps.Canvas,
    {
      group: 'visual',
      children: drawings,
      label:
        'The required label names the scene; labelled shapes form a hidden accessible list.',
      accessibility: {
        keyboard:
          'Tab through labelled shapes; Enter or Space selects and presses a shape. Arrow keys pan and + or - zoom a pan-zoom scene; Home resets the camera.',
        voiceOver:
          'The image label names the scene. An ordered list exposes labelled shapes; activating one selects and presses that shape.',
      },
      appearance:
        'Skia shapes use tone tokens and optional intensity shades. System Text overlays are culled when they do not fit. The App owns pan, zoom, selection outlines and pointer tooltips. No automatic motion.',
    },
  ),
  'Canvas.Rect': defineKitComponent(
    'A keyed rectangle inside Canvas.',
    visualDataProps['Canvas.Rect'],
    { group: 'visual' },
  ),
  'Canvas.Circle': defineKitComponent(
    'A keyed circle inside Canvas.',
    visualDataProps['Canvas.Circle'],
    { group: 'visual' },
  ),
  'Canvas.Line': defineKitComponent(
    'A keyed line inside Canvas.',
    visualDataProps['Canvas.Line'],
    { group: 'visual' },
  ),
  'Canvas.Path': defineKitComponent(
    'A keyed SVG path inside Canvas, under Svg’s path rules.',
    visualDataProps['Canvas.Path'],
    { group: 'visual' },
  ),
  'Canvas.Text': defineKitComponent(
    'System Text over Canvas; hidden when it does not fit.',
    visualDataProps['Canvas.Text'],
    { group: 'visual' },
  ),
  'Canvas.Group': defineKitComponent(
    'A translated, scaled and rotated group inside Canvas. Rotation is in degrees.',
    visualDataProps['Canvas.Group'],
    { group: 'visual', children: drawings },
  ),
};
