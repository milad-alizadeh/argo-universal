import { z } from 'zod';
import {
  part,
  stringLabel,
  optionalLabel,
  tone,
  onPress,
} from '../plugin-part-schema-utils';

export const statusPartSchemas = {
  Pill: part(
    'Static short text with a semantic tone or tracker color.',
    z.object({
      label: stringLabel,
      tone,
      color: z.string().optional().describe('Tracker label color.'),
    }),
    {
      appearance:
        '`tone` uses semantic colors that adapt to light and dark appearance. `color` is for tracker labels and is preserved as supplied.',
    },
  ),
  StatusDot: part(
    'A compact semantic status mark with an optional pulse.',
    z.object({
      tone,
      pulse: z
        .boolean()
        .optional()
        .describe('Whether to animate the status pulse.'),
      accessibilityLabel: optionalLabel,
    }),
    {
      label:
        'Provide `accessibilityLabel` when the status mark conveys information.',
    },
  ),
  Spinner: part(
    'An indeterminate progress indicator.',
    z.object({ accessibilityLabel: optionalLabel }),
    { label: 'Defaults to the accessible name “Loading”.' },
  ),
  ProgressBar: part(
    'A determinate progress indicator with semantic tone.',
    z.object({
      value: z.number().min(0).max(1).describe('Progress from 0 to 1.'),
      tone,
      accessibilityLabel: optionalLabel,
    }),
    {
      label:
        'Defaults to a localized progress value; set `accessibilityLabel` for context.',
    },
  ),
  Callout: part(
    'A title, description, and one primary action.',
    z.object({
      title: stringLabel,
      description: optionalLabel,
      action: onPress.optional(),
    }),
    {
      slots: { title: ['Text'], description: ['Text'], actions: ['Button'] },
      events: { onPress: z.undefined() },
    },
  ),
  EmptyState: part(
    'An icon, title, description, and one action for an empty view.',
    z.object({
      icon: z.string().optional(),
      title: stringLabel,
      description: optionalLabel,
      action: onPress.optional(),
    }),
    { events: { onPress: z.undefined() } },
  ),
};
