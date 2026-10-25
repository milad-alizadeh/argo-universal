import { collapsibleProps, openChange } from '../overlay-kit-props';
import { part } from '../plugin-part-schema-utils';

export const layoutPartSchemas = {
  Collapsible: part(
    'A disclosure container that shows or hides its content.',
    collapsibleProps,
    {
      group: 'layout',
      wire: false,
      children: true,
      events: { onOpenChange: openChange(collapsibleProps) },
      slots: {},
    },
  ),
};
