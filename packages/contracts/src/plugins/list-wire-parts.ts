import {
  contentListProps,
  listSectionProps,
  listItemProps,
  labelProps,
  progressBarProps,
  pillProps,
} from './kit-props';
import { listExpansion } from './list-expansion';
import { rowPress } from './list-kit-props';
import { listMediaParts } from './list-media-parts';
import { progressBarAccessibility } from './part-accessibility-metadata';
import { echoes } from './plugin-part-props';
import { part } from './plugin-part-schema-utils';

export const listWireParts = {
  List: {
    props: contentListProps,
    expansion: listExpansion,
    container: true,
    children: true,
    slots: {
      empty: ['Text', 'Stack', 'EmptyState'],
      header: ['Text', 'Label'],
    },
    events: {},
    reference: part(
      'A content list with rows, adaptive media grids or horizontal shelves.',
      contentListProps,
      {
        children: true,
      },
    ).reference,
  },
  'List.Section': {
    props: listSectionProps,
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
    container: true,
    children: false,
    slots: {
      actions: ['ActionList'],
      media: listMediaParts,
      leading: ['Icon', 'Avatar', 'Image', 'Text', 'Label', 'Svg'],
      trailing: ['Text', 'Label', 'Pill', 'StatusDot', 'Button'],
      meta: ['Label', 'Pill'],
    },
    events: { onPress: rowPress },
    reference: part(
      'A slotted row or media tile, arranged by its List, with selection, a corner badge and context Actions.',
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
    container: false,
    children: false,
    slots: {},
    events: {},
    reference: part('Static short text with a semantic tone.', pillProps)
      .reference,
  },
} as const;
