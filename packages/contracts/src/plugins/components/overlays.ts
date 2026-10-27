import { z } from 'zod';
import { defineKitComponent } from '../define-kit-component';
import {
  alertProps,
  openChange,
  openStateProps,
  sheetProps,
  toastProps,
  tooltipProps,
} from '../overlay-kit-props';
import { menuEvents, menuSchema } from '../selection-schemas';

// The App owns an overlay's open state: it flips it at once and tells the Plugin.
export const overlaysComponents = {
  Alert: defineKitComponent(
    'A question asked over the page; its Actions answer it.',
    alertProps,
    {
      group: 'overlays',
      children: true,
      events: { onOpenChange: openChange(alertProps) },
    },
  ),
  Sheet: defineKitComponent('A sheet raised over the page.', sheetProps, {
    group: 'overlays',
    children: true,
    events: { onOpenChange: openChange(sheetProps) },
  }),
  Menu: defineKitComponent('A choice or action menu.', menuSchema, {
    group: 'overlays',
    wire: false,
    events: menuEvents,
  }),
  Dialog: defineKitComponent(
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
  Popover: defineKitComponent('A popover overlay.', openStateProps, {
    group: 'overlays',
    wire: false,
    children: true,
    events: { onOpenChange: openChange(openStateProps) },
  }),
  Tooltip: defineKitComponent(
    'A short description attached to a control.',
    tooltipProps,
    {
      group: 'overlays',
      wire: false,
    },
  ),
  Toast: defineKitComponent(
    'A transient status message opened through an Action.',
    toastProps,
    {
      group: 'overlays',
      wire: false,
      events: { onPress: z.undefined() },
    },
  ),
};
