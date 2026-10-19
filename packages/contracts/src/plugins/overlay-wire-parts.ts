import { alertProps, openChange, sheetProps } from './overlay-kit-props';
import { part } from './plugin-part-schema-utils';

// The App owns an overlay's open state: it flips it at once and tells the Plugin.
export const overlayWireParts = {
  Alert: part(
    'A question asked over the page; its Actions answer it.',
    alertProps,
    {
      children: true,
      events: { onOpenChange: openChange(alertProps) },
    },
  ),
  Sheet: {
    ...part('A sheet raised over the page.', sheetProps, {
      children: true,
      events: { onOpenChange: openChange(sheetProps) },
    }),
    // A Plugin's sheet holds composed content, so the kit Sheet gives it the standard sheet inset.
    appProps: sheetProps.transform((props) => ({ ...props, inset: true })),
  },
};
