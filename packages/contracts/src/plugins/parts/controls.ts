import { z } from 'zod';
import { echoes } from '../plugin-part-props';
import { part } from '../plugin-part-schema-utils';
import { searchFieldProps } from '../presentation-kit-props';
import { filterPillProps } from '../presentation-kit-props';
import { textChangeEvents } from '../text-field-kit-props';
import { sliderProps } from './input-control-props';

// A draft Slider may leave its handler off the wire: the App holds the draft.
const sliderDraft = sliderProps.extend({
  onValueChange: sliderProps.shape.onValueChange.optional(),
});

export const controlsPartSchemas = {
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
    wireProps: sliderDraft,
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
