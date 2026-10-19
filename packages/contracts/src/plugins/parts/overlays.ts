import { z } from 'zod';
import { toastProps } from '../overlay-kit-props';
import { tooltipProps } from '../overlay-kit-props';
import { openStateProps } from '../overlay-kit-props';
import { openChange } from '../overlay-kit-props';
import { dialogAccessibility } from '../part-accessibility-metadata';
import { part } from '../plugin-part-schema-utils';
import { selectionPartSchemas } from '../selection-parts';
import { wireParts } from '../wire-parts';

export const overlaysPartSchemas = {
  Alert: wireParts.Alert,
  Dialog: part(
    'A form overlay; presented as a sheet on phone.',
    openStateProps,
    {
      children: true,
      accessibility: dialogAccessibility,
      events: { onOpenChange: openChange(openStateProps) },
    },
  ),
  Sheet: wireParts.Sheet,
  Popover: part('A popover overlay.', openStateProps, {
    children: true,
    events: { onOpenChange: openChange(openStateProps) },
  }),
  Menu: selectionPartSchemas.Menu,
  Tooltip: part('A short description attached to a control.', tooltipProps),
  Toast: part(
    'A transient status message opened through an Action.',
    toastProps,
    { events: { onPress: z.undefined() } },
  ),
};
