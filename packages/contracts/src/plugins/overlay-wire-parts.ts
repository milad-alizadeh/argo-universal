import { z } from 'zod';
import { alertProps, openChange, sheetProps } from './overlay-kit-props';
import { part, stringLabel, optionalLabel } from './plugin-part-schema-utils';

const legacySheet = z.object({ title: optionalLabel });

// The App owns an overlay's open state: it flips it at once and tells the Plugin.
export const overlayWireParts = {
  Alert: part(
    'A question asked over the page; its Actions answer it.',
    alertProps,
    {
      children: true,
      previous: [
        z.object({
          title: stringLabel,
          message: optionalLabel,
          confirmLabel: stringLabel,
          cancelLabel: optionalLabel,
        }),
      ],
      events: { onOpenChange: openChange },
    },
  ),
  Sheet: {
    ...part('A sheet raised over the page.', sheetProps, {
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
    // A Plugin's sheet holds composed content, so the kit Sheet gives it the standard sheet inset.
    appProps: sheetProps.transform((props) => ({ ...props, inset: true })),
  },
};
