import { z } from 'zod';
import { part } from '../part';
import { echoes, handler, stringLabel } from '../plugin-part-props';
import { filterPillProps, searchFieldProps } from '../presentation-kit-props';
import { textChangeEvents } from '../text-field-kit-props';
import { sliderProps } from './input-control-props';

const option = z.object({
  value: z.string().describe('The value chosen by this segment.'),
  label: stringLabel,
  disabled: z
    .boolean()
    .optional()
    .describe('Whether this choice is unavailable.'),
});

const segmentedControlProps = z.object({
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

export const controlsParts = {
  SegmentedControl: part(
    'Switches between a short set of views.',
    segmentedControlProps,
    {
      group: 'controls',
      events: {
        onValueChange: echoes(segmentedControlProps, 'value', {
          blocks: false,
        }),
      },
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
  ),
  SearchField: part(
    'Search input for Screen headers and Lists.',
    searchFieldProps,
    {
      group: 'controls',
      wire: false,
      label:
        'The required label names the search and supplies its placeholder.',
      accessibility: {
        keyboard:
          'Keyboard focus reaches the Search field in platform order; typing updates its App-owned value and dispatches onChangeText.',
        voiceOver:
          'VoiceOver exposes a search text field, reads the localized Search name, and reports its current value.',
        talkBack:
          'TalkBack exposes a search text field, reads the localized Search name, and reports its current value.',
      },
      events: textChangeEvents(searchFieldProps),
      slots: { title: ['Text', 'Stack'], actions: ['Button', 'IconButton'] },
    },
  ),
  FilterPill: part('A toggleable filter chip.', filterPillProps, {
    group: 'controls',
    wire: false,
    events: { onPress: z.undefined() },
  }),
  Slider: part('A labeled numeric range control.', sliderProps, {
    group: 'controls',
    events: {
      onValueChange: echoes(sliderProps, 'value', {
        throttleMs: 150,
        blocks: false,
      }),
    },
    label:
      'The accessibilityLabel names the control; its value and range are announced.',
  }),
};
