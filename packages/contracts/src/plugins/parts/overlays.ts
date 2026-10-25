import { z } from 'zod';
import { toastProps } from '../overlay-kit-props';
import { tooltipProps } from '../overlay-kit-props';
import { openStateProps } from '../overlay-kit-props';
import { openChange } from '../overlay-kit-props';
import { part } from '../plugin-part-schema-utils';

export const overlaysPartSchemas = {
  Dialog: part(
    'A form overlay; presented as a sheet on phone.',
    openStateProps,
    {
      group: 'overlays',
      wire: false,
      children: true,
      accessibility: {
        keyboard:
          'Focus remains within the Dialog until it closes; Escape closes it when dismissal is allowed.',
        voiceOver:
          'VoiceOver exposes a dialog named by its title and keeps navigation within it until it closes.',
        talkBack:
          'TalkBack exposes a dialog named by its title and keeps navigation within it until it closes.',
      },
      events: { onOpenChange: openChange(openStateProps) },
    },
  ),
  Popover: part('A popover overlay.', openStateProps, {
    group: 'overlays',
    wire: false,
    children: true,
    events: { onOpenChange: openChange(openStateProps) },
  }),
  Tooltip: part('A short description attached to a control.', tooltipProps, {
    group: 'overlays',
    wire: false,
  }),
  Toast: part(
    'A transient status message opened through an Action.',
    toastProps,
    {
      group: 'overlays',
      wire: false,
      events: { onPress: z.undefined() },
    },
  ),
};
