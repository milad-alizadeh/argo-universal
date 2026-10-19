import { collapsibleProps, openChange } from '../overlay-kit-props';
import { part } from '../plugin-part-schema-utils';
import { wireParts } from '../wire-parts';

export const layoutPartSchemas = {
  Stack: wireParts.Stack,
  Spacer: wireParts.Spacer,
  Grid: wireParts.Grid,
  Surface: wireParts.Surface,
  Card: wireParts.Card,
  ScrollView: wireParts.ScrollView,
  Collapsible: part(
    'A disclosure container that shows or hides its content.',
    collapsibleProps,
    {
      children: true,
      events: { onOpenChange: openChange(collapsibleProps) },
      slots: {},
    },
  ),
};
