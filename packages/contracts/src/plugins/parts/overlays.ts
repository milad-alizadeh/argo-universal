import { z } from 'zod';
import { toastProps } from '../overlay-kit-props';
import { tooltipProps } from '../overlay-kit-props';
import { openStateProps } from '../overlay-kit-props';
import { openChange } from '../overlay-kit-props';
import { dialogAccessibility } from '../part-accessibility-metadata';
import {
  part,
  stringLabel,
  optionalLabel,
  tone,
} from '../plugin-part-schema-utils';
import { selectionPartSchemas } from '../selection-parts';
import { wireParts } from '../wire-parts';

const legacyTooltip = z.object({ text: stringLabel });

const legacyToast = z.object({
  title: stringLabel,
  description: optionalLabel,
  tone,
});

export const overlaysPartSchemas = {
  Alert: wireParts.Alert,
  Dialog: part(
    'A form overlay; presented as a sheet on phone.',
    openStateProps,
    {
      children: true,
      accessibility: dialogAccessibility,
      previous: [z.object({ title: stringLabel })],
      events: { onOpenChange: openChange(openStateProps) },
    },
  ),
  Sheet: wireParts.Sheet,
  Popover: part('A popover overlay.', openStateProps, {
    children: true,
    previous: [z.object({})],
    events: { onOpenChange: openChange(openStateProps) },
  }),
  Menu: selectionPartSchemas.Menu,
  Tooltip: part('A short description attached to a control.', tooltipProps, {
    previous: [
      tooltipProps
        .transform((props): z.input<typeof legacyTooltip> => ({
          text: props.label,
        }))
        .pipe(legacyTooltip),
    ],
  }),
  Toast: part(
    'A transient status message opened through an Action.',
    toastProps,
    {
      previous: [
        toastProps
          .transform((props): z.input<typeof legacyToast> => {
            const legacy: z.input<typeof legacyToast> = {
              title: props.title,
              tone: props.tone,
            };

            if (props.message !== undefined) legacy.description = props.message;

            return legacy;
          })
          .pipe(legacyToast),
      ],
      events: { onPress: z.undefined() },
    },
  ),
};
