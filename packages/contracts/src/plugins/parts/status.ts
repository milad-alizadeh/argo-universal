import { z } from 'zod';
import { tones } from '../../kit-tokens';
import { part, stringLabel, optionalLabel } from '../plugin-part-schema-utils';
import { calloutProps } from '../presentation-kit-props';

export const statusPartSchemas = {
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
      group: 'status',
      wire: false,
      label:
        'Provide `accessibilityLabel` when the status mark conveys information.',
      accessibility: {
        keyboard:
          'StatusDot adds no keyboard focus stop; informative status is announced in reading order.',
        voiceOver:
          'VoiceOver skips a decorative StatusDot and announces accessibilityLabel when the mark conveys status.',
        talkBack:
          'TalkBack skips a decorative StatusDot and announces accessibilityLabel when the mark conveys status.',
      },
    },
  ),
  Spinner: part(
    'An indeterminate progress indicator.',
    z.object({ accessibilityLabel: stringLabel }),
    {
      group: 'status',
      wire: false,
      label: 'The required accessibilityLabel names the loading work.',
      accessibility: {
        keyboard: 'Spinner adds no keyboard focus stop or shortcut.',
        voiceOver:
          'VoiceOver exposes an indeterminate progress indicator and announces Loading, or the supplied accessibilityLabel.',
        talkBack:
          'TalkBack exposes an indeterminate progress indicator and announces Loading, or the supplied accessibilityLabel.',
      },
    },
  ),
  Callout: part(
    'A heading, description, detail, and optional actions.',
    calloutProps,
    {
      group: 'status',
      wire: false,
      events: { onPress: z.undefined() },
      accessibility: {
        keyboard:
          'The Callout title and description remain in reading order; keyboard focus reaches its actions in platform order.',
        voiceOver:
          'VoiceOver reads the Callout title and description before announcing its optional actions.',
        talkBack:
          'TalkBack reads the Callout title and description before announcing its optional actions.',
      },
      slots: { actions: ['Button', 'IconButton'] },
    },
  ),
};
