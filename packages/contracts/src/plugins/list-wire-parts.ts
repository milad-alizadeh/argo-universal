import { z } from 'zod';
import { acknowledgedEvent } from './kit-event-props';
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
import { echoes } from './plugin-part-props';
import { actionSlot, part } from './plugin-part-schema-utils';

const searchThrottleMs = 250;

export const listWireParts = {
  List: {
    ...part(
      'A content list with rows, adaptive media grids or horizontal shelves.',
      contentListProps,
      {
        group: 'lists',
        children: true,
        slots: {
          empty: ['Text', 'Stack', 'EmptyState'],
          header: ['Text', 'Label'],
          actions: actionSlot,
        },
        events: {
          onLoadMore: acknowledgedEvent('pagination'),
          onRefresh: acknowledgedEvent(),
          onChange: z
            .array(z.string())
            .readonly()
            .meta({ within: 'selection', value: 'selected', blocks: false }),
          onSearchTextChange: z
            .string()
            .meta({ blocks: false, throttleMs: searchThrottleMs }),
        },
      },
    ),
    expansion: listExpansion,
  },
  'List.Section': part(
    'A titled List section with optional subtitle, footer and header Actions.',
    listSectionProps,
    {
      group: 'lists',
      children: true,
      slots: {
        actions: actionSlot,
        leading: ['Text', 'Label'],
        trailing: ['Text', 'Label', 'Pill'],
      },
      events: {
        onSelectionChange: echoes(listSectionProps, 'selection'),
      },
    },
  ),
  ListItem: part(
    'A slotted row or media tile, arranged by its List, with selection, a corner badge and context Actions. Child ListItems nest under it and fold on desktop.',
    listItemProps,
    {
      group: 'lists',
      container: true,
      children: ['ListItem'] as const,
      slots: {
        actions: actionSlot,
        media: listMediaParts,
        leading: ['Icon', 'Avatar', 'Image', 'Text', 'Label', 'Svg'],
        trailing: ['Text', 'Label', 'Pill', 'StatusDot', 'Button'],
        meta: ['Label', 'Pill'],
      },
      events: { onPress: rowPress },
      label:
        'The title and optional value supply the accessible name; accessibilityLabel overrides it.',
    },
  ),
  Label: part(
    'Short text with an optional icon and semantic tone.',
    labelProps,
    {
      group: 'content',
      label:
        'The text supplies the accessible name; accessibilityLabel overrides it.',
    },
  ),
  ProgressBar: part(
    'A determinate progress indicator with an optional running sweep.',
    progressBarProps,
    {
      group: 'status',
      accessibility: {
        keyboard: 'ProgressBar adds no keyboard focus stop or shortcut.',
        voiceOver:
          'VoiceOver exposes a progress indicator and announces its value with accessibilityLabel when supplied.',
        talkBack:
          'TalkBack exposes a progress indicator and announces its value with accessibilityLabel when supplied.',
      },
    },
  ),
  Pill: part('Static short text with a semantic tone.', pillProps, {
    group: 'status',
  }),
} as const;
