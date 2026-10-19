import { z } from 'zod';
import { toastProps } from '../overlay-kit-props';
import { tooltipProps } from '../overlay-kit-props';
import { sheetProps } from '../overlay-kit-props';
import { openStateProps } from '../overlay-kit-props';
import { alertProps, openChange } from '../overlay-kit-props';
import { dialogAccessibility } from '../part-accessibility-metadata';
import {
  part,
  stringLabel,
  optionalLabel,
  tone,
} from '../plugin-part-schema-utils';
import { selectionPartSchemas } from '../selection-parts';

const legacyTooltip = z.object({ text: stringLabel });

const legacyToast = z.object({
  title: stringLabel,
  description: optionalLabel,
  tone,
});

const legacySheet = z.object({ title: optionalLabel });

export const overlaysPartSchemas = {
  Alert: part('A confirmation overlay opened through an Action.', alertProps, {
    previous: [
      z.object({
        title: stringLabel,
        message: optionalLabel,
        confirmLabel: stringLabel,
        cancelLabel: optionalLabel,
      }),
    ],
    events: { onOpenChange: openChange, onPress: z.undefined() },
  }),
  Dialog: part(
    'A form overlay opened through an Action; presented as a sheet on phone.',
    openStateProps,
    {
      children: true,
      accessibility: dialogAccessibility,
      previous: [z.object({ title: stringLabel })],
      events: { onOpenChange: openChange },
    },
  ),
  Sheet: part('A sheet overlay opened through an Action.', sheetProps, {
    children: true,
    previous: [
      sheetProps
        .transform((props): z.input<typeof legacySheet> =>
          props.label === undefined ? {} : { title: props.label },
        )
        .pipe(legacySheet),
    ],
    events: { onOpenChange: openChange },
  }),
  Popover: part('A popover overlay opened through an Action.', openStateProps, {
    children: true,
    previous: [z.object({})],
    events: { onOpenChange: openChange },
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
