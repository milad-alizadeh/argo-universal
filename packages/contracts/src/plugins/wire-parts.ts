import { z } from 'zod';
import {
  textProps,
  textV1,
  buttonProps,
  layoutProps,
  stackProps,
  groupedItemProps,
  listProps,
  svgProps,
} from './kit-props';

export const listPartNames = ['VirtualList', 'Table', 'GroupedList'] as const;

const contentParts = [
  'Text',
  'Button',
  'Stack',
  'Row',
  'Column',
  'GroupedListItem',
  'Svg',
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
  },
  VirtualList: {
    props: listProps,
    versions: [listProps],
    container: true,
    children: true,
    slots: {},
    events: {},
  },
  Table: {
    props: listProps,
    versions: [listProps],
    container: true,
    children: true,
    slots: {},
    events: {},
  },
  GroupedList: {
    props: listProps,
    versions: [listProps],
    container: true,
    children: true,
    slots: {},
    events: {},
  },
  Text: {
    props: textProps,
    versions: [textV1, textProps],
    container: false,
    children: false,
    slots: {},
    events: {},
  },
  Button: {
    props: buttonProps,
    versions: [buttonProps],
    container: false,
    children: false,
    slots: {},
    events: { onPress: z.undefined() },
  },
  Stack: {
    props: stackProps,
    versions: [stackProps],
    container: true,
    children: true,
    slots: {},
    events: {},
  },
  Row: {
    props: layoutProps,
    versions: [layoutProps],
    container: true,
    children: true,
    slots: {},
    events: {},
  },
  Column: {
    props: layoutProps,
    versions: [layoutProps],
    container: true,
    children: true,
    slots: {},
    events: {},
  },
  Svg: {
    props: svgProps,
    versions: [svgProps],
    container: false,
    children: false,
    slots: {},
    events: { onPress: z.undefined() },
  },
} as const;
