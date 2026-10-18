import { z } from 'zod';
import {
  contentListProps,
  listSectionProps,
  listItemProps,
  labelProps,
  progressBarProps,
  pillProps,
} from './kit-props';

export const listWireParts = {
  List: {
    props: contentListProps,
    versions: [contentListProps],
    container: true,
    children: true,
    slots: { empty: ['Text', 'Stack'] },
    events: {},
  },
  'List.Section': {
    props: listSectionProps,
    versions: [listSectionProps],
    container: true,
    children: true,
    slots: { leading: ['Text', 'Label'], trailing: ['Text', 'Label', 'Pill'] },
    events: {},
  },
  ListItem: {
    props: listItemProps,
    versions: [listItemProps],
    container: true,
    children: false,
    slots: {
      leading: ['Text', 'Label'],
      trailing: ['Text', 'Label', 'Pill'],
      meta: ['Label', 'Pill'],
    },
    events: { onPress: z.undefined() },
  },
  Label: {
    props: labelProps,
    versions: [labelProps],
    container: false,
    children: false,
    slots: {},
    events: {},
  },
  ProgressBar: {
    props: progressBarProps,
    versions: [progressBarProps],
    container: false,
    children: false,
    slots: {},
    events: {},
  },
  Pill: {
    props: pillProps,
    versions: [pillProps],
    container: false,
    children: false,
    slots: {},
    events: {},
  },
} as const;
