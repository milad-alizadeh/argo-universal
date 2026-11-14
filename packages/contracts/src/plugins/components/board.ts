import {
  boardCardProps,
  boardColumnProps,
  boardMoveProps,
  boardProps,
} from '../board-kit-props';
import { defineKitComponent } from '../define-kit-component';
import { rowPress } from '../list-kit-props';

export const boardComponents = {
  Board: defineKitComponent(
    'Columns of cards a person moves between columns, by drag or from a card’s menu; each move fills an Operation call.',
    boardProps,
    {
      group: 'lists',
      children: ['Board.Column'] as const,
      events: {
        // The card shows in its new column, pending, until the Operation answers, and goes back if it fails.
        onMove: boardMoveProps.meta({ blocks: false }),
      },
      label:
        'accessibilityLabel names the board; each column reads as a group named by its title.',
      accessibility: {
        keyboard:
          'Each card is one focus stop; Enter or Space runs it and the context-menu key opens its Move Actions, one for each column it may move to.',
        voiceOver:
          'Each column reads as a group with its title and count; a card’s Actions offer the same moves a drag makes.',
      },
      appearance:
        'Columns sit side by side and scroll sideways when they do not fit, at every width; cards draw as kit rows in light and dark appearance.',
    },
  ),
  'Board.Column': defineKitComponent(
    'One Board column: a title, a count and its cards.',
    boardColumnProps,
    { group: 'lists', children: ['Board.Card'] as const },
  ),
  'Board.Card': defineKitComponent(
    'One Board card, drawn as a kit row: a title, a subtitle and optional meta; it names the columns it may move to.',
    boardCardProps,
    {
      group: 'lists',
      slots: { meta: ['Label', 'Pill'] },
      events: { onPress: rowPress },
      label:
        'The title and subtitle supply the accessible name; accessibilityLabel overrides it.',
    },
  ),
};
