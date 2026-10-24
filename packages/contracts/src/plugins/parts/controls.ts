import { z } from 'zod';
import { searchFieldAccessibility } from '../part-accessibility-metadata';
import { echoes } from '../plugin-part-props';
import { part } from '../plugin-part-schema-utils';
import { searchFieldProps } from '../presentation-kit-props';
import { filterPillProps } from '../presentation-kit-props';
import { textChangeEvents } from '../text-field-kit-props';
import { sliderProps } from './input-control-props';

export const controlsPartSchemas = {
  SearchField: part(
    'Search input for Screen headers and Lists.',
    searchFieldProps,
    {
      label:
        'The required label names the search and supplies its placeholder.',
      accessibility: searchFieldAccessibility,
      events: textChangeEvents(searchFieldProps),
      slots: { title: ['Text', 'Stack'], actions: ['Button', 'IconButton'] },
    },
  ),
  FilterPill: part('A toggleable filter chip.', filterPillProps, {
    events: { onPress: z.undefined() },
  }),
  Slider: part('A labeled numeric range control.', sliderProps, {
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
