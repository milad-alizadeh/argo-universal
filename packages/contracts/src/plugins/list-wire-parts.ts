import { z } from 'zod';
import {
  contentListProps,
  listSectionProps,
  listItemProps,
  labelProps,
  progressBarProps,
  pillProps,
  rowBadgeProps,
} from './kit-props';
import { progressBarAccessibility } from './part-accessibility-metadata';
import { part } from './plugin-part-schema-utils';

const listItemV1Base = listItemProps.extend({
  badge: z.number().int().nonnegative().optional(),
});

const listItemV1Status = listItemProps
  .extend({ badge: rowBadgeProps.options[0].optional() })
  .transform((props) => {
    delete props.badge;

    return props;
  });

const listItemV1 = z.union([listItemV1Status, listItemV1Base]);

const listItemV2 = listItemProps;

const pillV1 = pillProps.omit({ color: true });

export const listWireParts = {
  List: {
    props: contentListProps,
    versions: [contentListProps],
    container: true,
    children: true,
    slots: { empty: ['Text', 'Stack'] },
    events: {},
    reference: part(
      'A content list with plain, grouped or card rows.',
      contentListProps,
      {
        children: true,
      },
    ).reference,
  },
  'List.Section': {
    props: listSectionProps,
    versions: [listSectionProps],
    container: true,
    children: true,
    slots: { leading: ['Text', 'Label'], trailing: ['Text', 'Label', 'Pill'] },
    events: {},
    reference: part(
      'A titled List section with optional subtitle and footer.',
      listSectionProps,
      {
        children: true,
      },
    ).reference,
  },
  ListItem: {
    props: listItemProps,
    versions: [listItemV1, listItemV2],
    container: true,
    children: false,
    slots: {
      leading: ['Text', 'Label'],
      trailing: ['Text', 'Label', 'Pill'],
      meta: ['Label', 'Pill'],
    },
    events: { onPress: z.undefined() },
    reference: part(
      'A slotted list row with up to three text lines and an optional Argo-drawn status or count badge on the leading lane.',
      listItemProps,
      {
        container: true,
        label:
          'The title and optional value supply the accessible name; accessibilityLabel overrides it.',
      },
    ).reference,
  },
  Label: {
    props: labelProps,
    versions: [labelProps],
    container: false,
    children: false,
    slots: {},
    events: {},
    reference: part('Short text with an icon and semantic tone.', labelProps, {
      label:
        'The text supplies the accessible name; accessibilityLabel overrides it.',
    }).reference,
  },
  ProgressBar: {
    props: progressBarProps,
    versions: [progressBarProps],
    container: false,
    children: false,
    slots: {},
    events: {},
    reference: part(
      'A determinate progress indicator with an optional running sweep.',
      progressBarProps,
      {
        accessibility: progressBarAccessibility,
      },
    ).reference,
  },
  Pill: {
    props: pillProps,
    versions: [pillV1, pillProps],
    container: false,
    children: false,
    slots: {},
    events: {},
    reference: part('Static short text with a semantic tone.', pillProps)
      .reference,
  },
} as const;
