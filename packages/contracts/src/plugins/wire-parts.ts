import { z } from 'zod';
import { actionListWireParts } from './action-list-wire-parts';
import { controlWireParts } from './control-wire-parts';
import { emptyStateWirePart } from './empty-state-wire-part';
import { groupedItemWirePart } from './grouped-item-wire-part';
import {
  buttonProps,
  buttonV1,
  layoutProps,
  listProps,
  stackProps,
  textProps,
  textV1,
  textV2,
  svgProps,
} from './kit-props';
import { legacyButtonProps } from './legacy-button-props';
import { legacyTextProps } from './legacy-text-props';
import { listExpansion } from './list-expansion';
import { listWireParts } from './list-wire-parts';
import { pageWirePart } from './page-wire-part';
import { pressUi } from './part-ui';
import { textForApp } from './text-for-app';
import type { WirePartDefinition } from './wire-part-definition';
import { wirePartReferences } from './wire-part-reference';

export type { WirePartDefinition } from './wire-part-definition';

export { listPartNames } from './list-expansion';

// Append a schema when a part changes; old versions keep their original props.
export const wireParts = {
  Page: pageWirePart,
  ...listWireParts,
  ...actionListWireParts,
  ...controlWireParts,
  GroupedListItem: groupedItemWirePart,
  VirtualList: {
    props: listProps,
    expansion: listExpansion,
    versions: [listProps],
    container: true,
    children: true,
    slots: {},
    events: {},
    reference: wirePartReferences.VirtualList,
  },
  Table: {
    props: listProps,
    expansion: listExpansion,
    versions: [listProps],
    container: true,
    children: true,
    slots: {},
    events: {},
    reference: wirePartReferences.Table,
  },
  GroupedList: {
    props: listProps,
    expansion: listExpansion,
    versions: [listProps],
    container: true,
    children: true,
    slots: {},
    events: {},
    reference: wirePartReferences.GroupedList,
  },
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
    ui: pressUi,
    props: buttonProps,
    versions: [
      buttonProps.transform(legacyButtonProps).pipe(buttonV1),
      buttonProps,
    ],
    container: false,
    children: false,
    slots: {},
    events: { onPress: z.undefined() },
    reference: wirePartReferences.Button,
  },
  Stack: {
    props: stackProps,
    versions: [stackProps],
    container: true,
    children: true,
    slots: {},
    events: {},
    reference: wirePartReferences.Stack,
  },
  Row: {
    props: layoutProps,
    versions: [layoutProps],
    container: true,
    children: true,
    slots: {},
    events: {},
    reference: wirePartReferences.Row,
  },
  Column: {
    props: layoutProps,
    versions: [layoutProps],
    container: true,
    children: true,
    slots: {},
    events: {},
    reference: wirePartReferences.Column,
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
