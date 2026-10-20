import { Platform } from 'react-native';
import type { ListAppearance, ListPosition } from '../../../list-context';
import { cn } from '../../../utils';
import { contentCard, type ItemDrawing } from './list-item-styles';

// iOS separates every list's rows; desktop and web separate a grouped card's rows only; Android leaves rows apart.
function separatesRows(appearance: ListAppearance): boolean {
  if (Platform.OS === 'web') return appearance === 'grouped';

  return Platform.OS === 'ios' && appearance !== 'cards';
}

const separatedPositions = new Set<ListPosition>(['first', 'middle']);

// A popover's rows and a sidebar's sit apart, as tiles.
const tiled = (drawing: ItemDrawing): boolean =>
  drawing.menu || drawing.rows === 'sidebar';

function hasSeparator(drawing: ItemDrawing): boolean {
  if (tiled(drawing)) return false;

  return (
    separatesRows(drawing.appearance) &&
    separatedPositions.has(drawing.position)
  );
}

/*
 * The desktop card draws its separators in its own hairline, and holds its rows 16 from its edge at every width. A
 * page's content card draws them in the border colour, 20 from its right edge as its rows are.
 */
const separatorDrawings = {
  web: {
    colour: 'bg-hairline',
    end: 'right-4',
    pastLeading: 'left-14',
    pastAvatar: 'left-17 wide-type:left-15',
  },
  native: {
    colour: 'bg-border',
    end: 'right-4',
    pastLeading: 'left-14 wide:left-15',
    pastAvatar: 'left-17',
  },
  content: {
    colour: 'bg-border',
    end: 'right-5',
    pastLeading: 'left-14',
    pastAvatar: 'left-17',
  },
};

// What leads the row, so its separator starts where the title does.
export type LeadingKind = 'none' | 'icon' | 'avatar';

const separatorStart = (
  separator: typeof separatorDrawings.web,
  leading: LeadingKind,
): string | undefined => {
  if (leading === 'avatar') return separator.pastAvatar;

  return leading === 'icon' ? separator.pastLeading : undefined;
};

const separatorDrawing = (
  drawing: ItemDrawing,
): typeof separatorDrawings.web => {
  if (contentCard(drawing)) return separatorDrawings.content;

  return Platform.OS === 'web'
    ? separatorDrawings.web
    : separatorDrawings.native;
};

export function itemSeparator(
  drawing: ItemDrawing,
  leading: LeadingKind,
): string | undefined {
  if (!hasSeparator(drawing)) return undefined;
  const separator = separatorDrawing(drawing);

  return cn(
    'absolute bottom-0 left-4',
    separator.end,
    separator.colour,
    separatorStart(separator, leading),
  );
}
