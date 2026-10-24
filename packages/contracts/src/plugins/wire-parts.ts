import { z } from 'zod';
import { actionWireParts } from './action-wire-parts';
import { canvasWireParts } from './canvas-wire-parts';
import { controlWireParts } from './control-wire-parts';
import { emptyStateWirePart } from './empty-state-wire-part';
import { fieldGroupWireParts } from './field-group-wire-parts';
import { imageWirePart } from './image-wire-part';
import { buttonProps, stackProps, textProps, svgProps } from './kit-props';
import { layoutWireParts } from './layout-wire-parts';
import { listWireParts } from './list-wire-parts';
import { mediaWireParts } from './media-wire-parts';
import { overlayWireParts } from './overlay-wire-parts';
import { part } from './plugin-part-schema-utils';
import { avatarProps, iconProps } from './presentation-kit-props';
import { proseWireParts } from './prose-wire-parts';
import { scaffoldWireParts } from './scaffold-wire-parts';
import { tableWireParts } from './table-wire-parts';
import type { WirePartDefinition } from './wire-part-definition';
import { wirePartReferences } from './wire-part-reference';

export type { WirePartDefinition } from './wire-part-definition';

export { listPartNames } from './list-expansion';

// Each part has one props schema; a change an older App can't draw bumps the Plugin wire version (ADR-0034).
export const wireParts = {
  ...proseWireParts,
  ...layoutWireParts,
  ...scaffoldWireParts,
  ...listWireParts,
  ...tableWireParts,
  ...actionWireParts,
  ...controlWireParts,
  ...fieldGroupWireParts,
  ...overlayWireParts,
  ...mediaWireParts,
  Image: imageWirePart,
  Avatar: part(
    'An image, initials or person symbol with optional status.',
    avatarProps,
  ),
  Icon: part('A native symbol with semantic size and tone.', iconProps),
  ...canvasWireParts,
  Text: {
    props: textProps,
    container: false,
    children: false,
    slots: { children: [] },
    events: {},
    reference: wirePartReferences.Text,
  },
  Button: {
    props: buttonProps,
    container: false,
    children: false,
    slots: {},
    // A press sends pending edits first, so a confirming Button acts on what the user typed.
    events: { onPress: z.undefined().meta({ flush: true }) },
    reference: wirePartReferences.Button,
  },
  Stack: {
    props: stackProps,
    container: true,
    children: true,
    slots: {},
    events: {},
    reference: wirePartReferences.Stack,
  },
  EmptyState: emptyStateWirePart,
  Svg: {
    props: svgProps,
    container: false,
    children: false,
    slots: {},
    events: { onPress: z.undefined() },
    reference: wirePartReferences.Svg,
  },
} as const satisfies Record<string, WirePartDefinition>;
