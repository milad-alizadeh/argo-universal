import { z } from 'zod';
import { emptyStateWirePart } from './empty-state-wire-part';
import {
  buttonProps,
  buttonV1,
  groupedItemProps,
  layoutProps,
  listProps,
  stackProps,
  textProps,
  textV1,
  textV2,
  svgProps,
  groupedItemV1,
} from './kit-props';
import { legacyButtonProps } from './legacy-button-props';
import { legacyTextProps } from './legacy-text-props';
import { listExpansion } from './list-expansion';
import { listWireParts } from './list-wire-parts';
import type { WirePartDefinition } from './wire-part-definition';
import { wirePartReferences } from './wire-part-reference';

export type { WirePartDefinition } from './wire-part-definition';

export const listPartNames = [
  'List',
  'VirtualList',
  'Table',
  'GroupedList',
] as const;

const contentParts = [
  'Text',
  'Button',
  'Stack',
  'Row',
  'Column',
  'GroupedListItem',
  'Svg',
  'Pill',
] as const;

// Append a schema when a part changes; old versions keep their original props.
export const wireParts = {
  ...listWireParts,
  GroupedListItem: {
    props: groupedItemProps,
    versions: [groupedItemV1],
    container: true,
    children: false,
    slots: {
      leading: contentParts,
      accessories: contentParts,
      footer: contentParts,
      detail: contentParts,
    },
    events: { onPress: z.undefined() },
    reference: wirePartReferences.GroupedListItem,
  },
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
