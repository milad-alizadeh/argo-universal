import { z } from 'zod';
import { tones } from '../../kit-tokens';
import { emptyStateProps } from '../core-kit-props';
import { defineKitComponent } from '../define-kit-component';
import { optionalLabel, stringLabel } from '../kit-component-props';
import { calloutProps } from '../presentation-kit-props';
import { pillProps, progressBarProps } from '../status-kit-props';

export const statusComponents = {
  ProgressBar: defineKitComponent(
    'A determinate progress indicator with an optional running sweep.',
    progressBarProps,
    {
      group: 'status',
      accessibility: {
        keyboard: 'ProgressBar adds no keyboard focus stop or shortcut.',
        voiceOver:
          'VoiceOver exposes a progress indicator and announces its value with accessibilityLabel when supplied.',
        talkBack:
          'TalkBack exposes a progress indicator and announces its value with accessibilityLabel when supplied.',
      },
    },
  ),
  Pill: defineKitComponent(
    'A semantic label or interactive control with shared pill geometry and supported glass material.',
    pillProps,
    {
      group: 'status',
    },
  ),
  EmptyState: defineKitComponent(
    'A centred message for an empty container with an optional icon, description, and one action.',
    emptyStateProps,
    {
      group: 'status',
      slots: { action: ['Button'] },
      appearance:
        'Uses Argo semantic tokens and the approved EmptyState master; its icon illustration is decorative.',
      accessibility: {
        label:
          'The required `title` is a heading, followed by the optional description and action.',
        keyboard:
          'The container is not focusable. Its optional Button uses its standard keyboard behavior.',
        voiceOver:
          'Reads the title as a heading, then the optional description and action.',
      },
    },
  ),
  StatusDot: defineKitComponent(
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
  Spinner: defineKitComponent(
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
  Callout: defineKitComponent(
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
