import { defineKitComponent } from '../define-kit-component';
import { echoes } from '../kit-component-props';
import { faderProps } from './input-control-props';

export const faderComponent = defineKitComponent(
  'A range control drawn as a surface that fills to its value, holding any kit content on top, such as a title, the value and a button.',
  faderProps,
  {
    group: 'controls',
    children: true,
    events: {
      onValueChange: echoes(faderProps, 'value', {
        throttleMs: 150,
        blocks: false,
      }),
    },
    label:
      'The accessibilityLabel names the control; its valueLabel and range are announced.',
    accessibility: {
      keyboard:
        'The surface is one focus stop: the arrow keys move the value by a step, Home and End to the ends. Interactive content on it keeps focus stops of its own.',
      voiceOver:
        'VoiceOver exposes an adjustable element named by accessibilityLabel that reads valueLabel; swiping up or down moves it by a step. Its content is read after it.',
      talkBack:
        'TalkBack exposes a seek control named by accessibilityLabel that reads valueLabel; the volume keys or a swipe move it by a step. Its content is read after it.',
    },
    appearance:
      'A rounded surface, as tall or wide as its parent gives it, filled from the bottom (vertical) or the leading edge (horizontal) to the value, in the fill colours or the accent tone. Dragging anywhere on it moves the value by the distance dragged, not to the touch, so a tap on its content does not change it. Content draws over the fill in a dark or light foreground the App picks from how light the fill is, spread along the direction: the first child at the start (top, or leading edge), the last at the end.',
  },
);
