import { part } from './plugin-part-schema-utils';
import { visualDataProps } from './visual-props';

const drawings = [
  'Canvas.Rect',
  'Canvas.Circle',
  'Canvas.Line',
  'Canvas.Path',
  'Canvas.Text',
  'Canvas.Group',
] as const;

export const canvasWireParts = {
  Canvas: part(
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
        talkBack:
          'The image label names the scene. An ordered list exposes labelled shapes; activating one selects and presses that shape.',
      },
      appearance:
        'Skia shapes use tone tokens and optional intensity shades. System Text overlays are culled when they do not fit. The App owns pan, zoom, selection outlines and pointer tooltips. No automatic motion.',
    },
  ),
  'Canvas.Rect': part(
    'A keyed rectangle inside Canvas.',
    visualDataProps['Canvas.Rect'],
    { group: 'visual' },
  ),
  'Canvas.Circle': part(
    'A keyed circle inside Canvas.',
    visualDataProps['Canvas.Circle'],
    { group: 'visual' },
  ),
  'Canvas.Line': part(
    'A keyed line inside Canvas.',
    visualDataProps['Canvas.Line'],
    { group: 'visual' },
  ),
  'Canvas.Path': part(
    'A keyed SVG path inside Canvas, under Svg’s path rules.',
    visualDataProps['Canvas.Path'],
    { group: 'visual' },
  ),
  'Canvas.Text': part(
    'System Text over Canvas; hidden when it does not fit.',
    visualDataProps['Canvas.Text'],
    { group: 'visual' },
  ),
  'Canvas.Group': part(
    'A translated, scaled and rotated group inside Canvas. Rotation is in degrees.',
    visualDataProps['Canvas.Group'],
    { group: 'visual', children: drawings },
  ),
};
