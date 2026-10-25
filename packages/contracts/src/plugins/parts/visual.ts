import { part } from '../plugin-part-schema-utils';
import { visualDataProps } from '../visual-props';

export const visualPartSchemas = {
  Chart: part('A bounded data visualization.', visualDataProps.Chart, {
    group: 'visual',
    label:
      'The required label names the chart; a hidden table lists every series.',
    accessibility: {
      keyboard:
        'Not focusable as an image; `onPress` enables button activation.',
      voiceOver:
        'Reads the label as an image or button, then a table of each series and its points.',
      talkBack:
        'Reads the label as an image or button, then a table of each series and its points.',
    },
    appearance:
      'Each series takes one tone token. Axis and value labels are system Text over the chart. No automatic motion.',
  }),
};
