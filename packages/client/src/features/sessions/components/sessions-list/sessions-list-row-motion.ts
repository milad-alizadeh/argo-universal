import { RowPositionContext } from '@repo/kit/list-context';
import { cn } from '@repo/kit/utils';
import { use } from 'react';
import { FadeIn } from 'react-native-reanimated';

const fadeInMilliseconds = 200;

const fades = { entering: FadeIn.duration(fadeInMilliseconds) };

const noFades = {};

// Rows that mount while the list reorders fade in; otherwise they appear at once. Leaving rows fade through `closing`.
export function rowFade(animate?: boolean): Partial<typeof fades> {
  return animate ? fades : noFades;
}

/*
 * A flat web row sits
 * 2 above the next, its hover and selected tints at the menu-row radius; a Project's last row sits 20 above the next
 * Project's heading.
 */
const sectionEnd = 'web:mb-4.5';

const flatRow = 'web:overflow-hidden web:rounded-xl';

export function rowClassName(closing?: boolean, endsSection?: boolean): string {
  return cn(
    'web:transition-opacity web:duration-150',
    flatRow,
    endsSection ? sectionEnd : 'web:mb-0.5',
    closing && 'opacity-0',
  );
}

// A row's place in its Project's section decides the space below it.
export function useRowClassName(closing?: boolean): string {
  const { position } = use(RowPositionContext);

  return rowClassName(closing, position === 'last' || position === 'only');
}

// A heading sits 2 below the list's top or the previous Project, 4 above its rows; collapsed, 20 above the next heading.
export function headingClassName(collapsed: boolean): string {
  return cn('web:pt-0.5', collapsed ? sectionEnd : 'web:mb-1');
}

// The empty Project's line ends its section as a last row does.
export const emptyRowClassName = sectionEnd;
