import { z } from 'zod';
import {
  buttonProps,
  groupedItemProps,
  layoutProps,
  listProps,
  stackProps,
  textProps,
  textV1,
} from './kit-props';
import {
  wirePartReferences,
  type WirePartReference,
} from './wire-part-reference';

export interface WirePartDefinition {
  props: z.ZodType;
  versions: readonly z.ZodType[];
  container: boolean;
  children: boolean;
  slots: Record<string, readonly string[]>;
  events: Record<string, z.ZodType>;
  reference: WirePartReference;
}

export const listPartNames = ['VirtualList', 'Table', 'GroupedList'] as const;

const contentParts = [
  'Text',
  'Button',
  'Stack',
  'Row',
  'Column',
  'GroupedListItem',
] as const;

// Append a schema when a part changes; old versions keep their original props.
export const wireParts = {
  GroupedListItem: {
    props: groupedItemProps,
    versions: [groupedItemProps],
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
    versions: [listProps],
    container: true,
    children: true,
    slots: {},
    events: {},
    reference: wirePartReferences.VirtualList,
  },
  Table: {
    props: listProps,
    versions: [listProps],
    container: true,
    children: true,
    slots: {},
    events: {},
    reference: wirePartReferences.Table,
  },
  GroupedList: {
    props: listProps,
    versions: [listProps],
    container: true,
    children: true,
    slots: {},
    events: {},
    reference: wirePartReferences.GroupedList,
  },
  Text: {
    props: textProps,
    versions: [textV1, textProps],
    container: false,
    children: false,
    slots: {},
    events: {},
    reference: wirePartReferences.Text,
  },
  Button: {
    props: buttonProps,
    versions: [buttonProps],
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
} as const satisfies Record<string, WirePartDefinition>;
