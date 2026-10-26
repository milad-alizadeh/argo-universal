import { z } from 'zod';
import { echoes, handler, stringLabel } from '../plugin-part-props';
import { part } from '../plugin-part-schema-utils';

const option = z.object({
  value: z.string().describe('The value chosen by this segment.'),
  label: stringLabel,
  disabled: z
    .boolean()
    .optional()
    .describe('Whether this choice is unavailable.'),
});

const props = z.object({
  label: stringLabel,
  options: z
    .array(option)
    .readonly()
    .describe('The mutually exclusive views, all visible at once.'),
  value: z.string().describe('The selected view.'),
  onValueChange: handler('onValueChange'),
  disabled: z
    .boolean()
    .optional()
    .describe('Whether the whole control is unavailable.'),
});

export const segmentedControlPart = part(
  'Switches between a short set of views.',
  props,
  {
    group: 'controls',
    events: { onValueChange: echoes(props, 'value', { blocks: false }) },
    label: 'The label names the group; each option label names its segment.',
    accessibility: {
      keyboard:
        'Tab reaches the selected or first enabled segment. Arrow keys wrap through enabled segments, choosing as they move. Home and End choose the first and last enabled segment; Space chooses the focused segment.',
      voiceOver:
        'Stock SwiftUI segmented Picker announces the group label, option labels, selection and disabled states.',
      talkBack:
        'Stock Material SingleChoiceSegmentedButtonRow announces option labels, selection and disabled states.',
    },
    appearance:
      'Web uses the tint track, card thumb and track focus-visible ring, with hover and pressed feedback. Native drawings retain stock shapes and Dynamic Type. No custom animation; reduced motion needs no transition.',
  },
);
