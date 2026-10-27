import { z } from 'zod';
import {
  alertProps,
  openChange,
  openStateProps,
  sheetProps,
  toastProps,
  tooltipProps,
} from '../overlay-kit-props';
import { part } from '../part';
import { menuEvents, menuSchema } from '../selection-schemas';

// The App owns an overlay's open state: it flips it at once and tells the Plugin.
export const overlaysParts = {
  Alert: part(
    'A question asked over the page; its Actions answer it.',
    alertProps,
    {
      group: 'overlays',
      children: true,
      events: { onOpenChange: openChange(alertProps) },
    },
  ),
  Sheet: part('A sheet raised over the page.', sheetProps, {
    group: 'overlays',
    children: true,
    events: { onOpenChange: openChange(sheetProps) },
    // A Plugin's sheet holds composed content, so the kit Sheet gives it the standard sheet inset.
    appProps: sheetProps.transform((props) => ({ ...props, inset: true })),
  }),
  Menu: part('A choice or action menu.', menuSchema, {
    group: 'overlays',
    wire: false,
    events: menuEvents,
  }),
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
