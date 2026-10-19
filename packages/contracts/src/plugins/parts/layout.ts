import { z } from 'zod';
import { collapsibleProps, openChange } from '../overlay-kit-props';
import {
  part,
  stringLabel,
  onPress,
  containerParts,
  actions,
} from '../plugin-part-schema-utils';
import { wireParts } from '../wire-parts';

export const layoutPartSchemas = {
  Stack: wireParts.Stack,
  Spacer: wireParts.Spacer,
  Grid: wireParts.Grid,
  Surface: wireParts.Surface,
  Card: part(
    'A composed card with fixed media, title, subtitle, body, and action Slots.',
    z.object({ onPress: onPress.optional() }),
    {
      slots: {
        media: ['Image', 'Video'],
        title: ['Text'],
        subtitle: ['Text'],
        body: containerParts,
        actions,
      },
      events: { onPress: z.undefined() },
      accessibility: {
        keyboard:
          'A Card with onPress enters keyboard focus order and activates with Enter or Space; otherwise focus moves through its interactive Slots.',
        voiceOver:
          'A pressable Card exposes button semantics and its title; a static Card keeps its media, text, and actions in reading order.',
        talkBack:
          'A pressable Card exposes button semantics and its title; a static Card keeps its media, text, and actions in reading order.',
      },
    },
  ),
  ScrollView: wireParts.ScrollView,
  Collapsible: part(
    'A disclosure container that shows or hides its content.',
    collapsibleProps,
    {
      previous: [
        z.object({
          label: stringLabel,
          expanded: z
            .boolean()
            .optional()
            .describe('Whether content is initially expanded.'),
        }),
      ],
      children: true,
      events: { onOpenChange: openChange(collapsibleProps) },
      slots: {},
    },
  ),
};
