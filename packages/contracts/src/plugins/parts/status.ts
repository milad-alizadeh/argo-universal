import { z } from 'zod';
import { tones } from '../../kit-tokens';
import {
  spinnerAccessibility,
  statusDotAccessibility,
} from '../part-accessibility-metadata';
import {
  part,
  stringLabel,
  optionalLabel,
  tone,
  onPress,
} from '../plugin-part-schema-utils';
import { calloutProps } from '../presentation-kit-props';
import { wireParts } from '../wire-parts';

export const statusPartSchemas = {
  Pill: wireParts.Pill,
  StatusDot: part(
    'A compact semantic status mark with an optional pulse.',
    z.object({
      tone: z.enum(tones).describe('The Argo semantic status tone.'),
      size: z.enum(['sm', 'md']).optional().describe('The status mark size.'),
      pulse: z
        .boolean()
        .optional()
        .describe('Whether to animate the status pulse.'),
      accessibilityLabel: optionalLabel,
    }),
    {
      previous: [
        z.object({
          tone,
          pulse: z.boolean().optional(),
          accessibilityLabel: optionalLabel,
        }),
      ],
      label:
        'Provide `accessibilityLabel` when the status mark conveys information.',
      accessibility: statusDotAccessibility,
    },
  ),
  Spinner: part(
    'An indeterminate progress indicator.',
    z.object({ accessibilityLabel: stringLabel }),
    {
      previous: [z.object({ accessibilityLabel: optionalLabel })],
      label: 'The required accessibilityLabel names the loading work.',
      accessibility: spinnerAccessibility,
    },
  ),
  ProgressBar: wireParts.ProgressBar,
  Callout: part('A title, description, and one primary action.', calloutProps, {
    events: { onPress: z.undefined() },
    accessibility: {
      keyboard:
        'The Callout title and description remain in reading order; keyboard focus reaches its primary action in platform order.',
      voiceOver:
        'VoiceOver reads the Callout title and description before announcing its single primary action.',
      talkBack:
        'TalkBack reads the Callout title and description before announcing its single primary action.',
    },
    previous: [
      z.object({
        title: stringLabel,
        description: optionalLabel,
        action: onPress.optional(),
      }),
    ],
    slots: { actions: ['Button', 'IconButton'] },
  }),
  EmptyState: part(
    'An icon, title, description, and one action for an empty view.',
    z.object({
      icon: z.string().optional(),
      title: stringLabel,
      description: optionalLabel,
      action: onPress.optional(),
    }),
    {
      events: { onPress: z.undefined() },
      accessibility: {
        keyboard:
          'The EmptyState title and description remain in reading order; keyboard focus reaches its optional action in platform order.',
        voiceOver:
          'VoiceOver announces the EmptyState title and description, then the optional action.',
        talkBack:
          'TalkBack announces the EmptyState title and description, then the optional action.',
      },
    },
  ),
};
