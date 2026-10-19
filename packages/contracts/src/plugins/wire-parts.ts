import { z } from 'zod';
import { actionListWireParts } from './action-list-wire-parts';
import { controlWireParts } from './control-wire-parts';
import { emptyStateWirePart } from './empty-state-wire-part';
import {
  buttonProps,
  buttonV1,
  layoutProps,
  stackProps,
  textProps,
  textV1,
  textV2,
  svgProps,
} from './kit-props';
import { layoutWireParts } from './layout-wire-parts';
import { legacyButtonProps } from './legacy-button-props';
import { legacyTextProps } from './legacy-text-props';
import { listWireParts } from './list-wire-parts';
import { mediaWireParts } from './media-wire-parts';
import { overlayWireParts } from './overlay-wire-parts';
import { scaffoldWireParts } from './scaffold-wire-parts';
import { tableWireParts } from './table-wire-parts';
import { textForApp } from './text-for-app';
import type { WirePartDefinition } from './wire-part-definition';
import { wirePartReferences } from './wire-part-reference';

export type { WirePartDefinition } from './wire-part-definition';

export { listPartNames } from './list-expansion';

// Append a schema when a part changes; old versions keep their original props.
export const wireParts = {
  ...layoutWireParts,
  ...scaffoldWireParts,
  ...listWireParts,
  ...tableWireParts,
  ...actionListWireParts,
  ...controlWireParts,
  ...overlayWireParts,
  ...mediaWireParts,
  Text: {
    props: textProps,
    appProps: textForApp,
    versions: [
      textProps.transform(legacyTextProps).pipe(textV1),
      textProps.transform(legacyTextProps).pipe(textV2),
      textProps,
    ],
    container: false,
    children: false,
    slots: { children: [] },
    events: {},
    reference: wirePartReferences.Text,
  },
  Button: {
    props: buttonProps,
    versions: [
      buttonProps.transform(legacyButtonProps).pipe(buttonV1),
      buttonProps,
    ],
    container: false,
    children: false,
    slots: {},
    // A press sends pending edits first, so a confirming Button acts on what the user typed.
    events: { onPress: z.undefined().meta({ flush: true }) },
    reference: wirePartReferences.Button,
  },
  Stack: {
    props: stackProps,
    versions: [stackProps],
    // Apps before Stack drew Row and Column.
    lower: ({ direction, ...props }) => ({
      type: direction === 'row' ? 'Row' : 'Column',
      props,
      versions: [layoutProps],
    }),
    container: true,
    children: true,
    slots: {},
    events: {},
    reference: wirePartReferences.Stack,
  },
  EmptyState: emptyStateWirePart,
  Svg: {
    props: svgProps,
    versions: [svgProps],
    container: false,
    children: false,
    slots: {},
    events: { onPress: z.undefined() },
    reference: wirePartReferences.Svg,
  },
} as const satisfies Record<string, WirePartDefinition>;
