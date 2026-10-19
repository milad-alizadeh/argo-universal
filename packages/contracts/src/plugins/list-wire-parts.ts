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
import { labelVersions } from './label-versions';
import { listExpansion } from './list-expansion';
import { rowPress } from './list-kit-props';
import { progressBarAccessibility } from './part-accessibility-metadata';
import { echoes } from './plugin-part-props';
import { part } from './plugin-part-schema-utils';
import { settingsRowWireParts } from './settings-row-wire-parts';

const listItemV1Props = listItemProps
  .omit({ description: true, id: true })
  .extend({
    badge: z.union([z.number().int().nonnegative(), rowBadgeProps]).optional(),
  });

function downgradeListItemV1(
  props: z.infer<typeof listItemV1Props>,
): z.infer<typeof listItemProps> {
  const { badge } = props;

  if (isLegacyBadge(badge)) return props;

  if (badge.kind === 'count') return { ...props, badge: badge.count };

  return omitBadge(props);
}

function isLegacyBadge(
  badge: z.infer<typeof listItemV1Props>['badge'],
): badge is number | undefined {
  return typeof badge === 'number' || badge === undefined;
}

function omitBadge(
  props: z.infer<typeof listItemV1Props>,
): z.infer<typeof listItemProps> {
  delete props.badge;

  return props;
}

const listItemV1 = listItemV1Props.transform(downgradeListItemV1);

const listItemV2 = listItemProps.omit({ description: true, id: true });

const pillV1 = pillProps.omit({ color: true });

export const listWireParts = {
  ...settingsRowWireParts,
  List: {
    props: contentListProps,
    expansion: listExpansion,
    versions: [contentListProps.omit({ footer: true }), contentListProps],
    container: true,
    children: true,
    slots: { empty: ['Text', 'Stack', 'EmptyState'] },
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
    versions: [
      listSectionProps.omit({
        selection: true,
        selectionMode: true,
        onSelectionChange: true,
      }),
      listSectionProps,
    ],
    container: true,
    children: true,
    slots: { leading: ['Text', 'Label'], trailing: ['Text', 'Label', 'Pill'] },
    events: {
      onSelectionChange: echoes(listSectionProps, 'selection'),
    },
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
    versions: [listItemV1, listItemV2, listItemProps],
    container: true,
    children: false,
    slots: {
      leading: ['Icon', 'Avatar', 'Image', 'Text', 'Label', 'Svg'],
      trailing: ['Text', 'Label', 'Pill', 'StatusDot', 'Button'],
      meta: ['Label', 'Pill'],
    },
    events: { onPress: rowPress },
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
    versions: labelVersions,
    container: false,
    children: false,
    slots: {},
    events: {},
    reference: part(
      'Short text with an optional icon and semantic tone.',
      labelProps,
      {
        label:
          'The text supplies the accessible name; accessibilityLabel overrides it.',
      },
    ).reference,
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
