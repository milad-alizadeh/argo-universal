import {
  gridProps,
  scrollViewProps,
  spacerProps,
  surfaceProps,
} from './layout-kit-props';
import { gridAccessibility } from './part-accessibility-metadata';
import { part } from './plugin-part-schema-utils';

export const layoutWireParts = {
  Spacer: part('Flexible space along its parent Stack direction.', spacerProps),
  Grid: part('Static equal-column grid; use List for long grids.', gridProps, {
    accessibility: gridAccessibility,
    children: true,
  }),
  Surface: part('A named Surface with fill, radius and depth.', surfaceProps, {
    children: true,
    slots: { actions: ['ActionList'] },
    appearance:
      'background is flat content; card is flat card; muted is recessed tray; glass is sidebar material, with a plain fill below iOS 26 and on Android.',
  }),
  ScrollView: part(
    'A scroll container owning its scroll fade.',
    scrollViewProps,
    {
      children: true,
    },
  ),
};
