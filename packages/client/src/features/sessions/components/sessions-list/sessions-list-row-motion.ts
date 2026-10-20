import { use } from 'react';
import { FadeIn } from 'react-native-reanimated';
import { ListContext } from '#lib/generic/list-context';
import { cn } from '#lib/generic/utils';

const fadeInMilliseconds = 200;

const fades = { entering: FadeIn.duration(fadeInMilliseconds) };

const noFades = {};

// Rows that mount while the list reorders fade in; otherwise they appear at once. Leaving rows fade through `closing`.
export function rowFade(animate?: boolean): Partial<typeof fades> {
  return animate ? fades : noFades;
}

/*
 * Web (Paper "SessionsList"): the list holds its rows 8 from the sidebar's left and 14 from its right. A flat row sits
 * 2 above the next, its hover and selected tints at the menu-row radius; a Project's last row sits 20 above the next
 * Project's heading.
 */
const flatRow = 'web:mr-1.5 web:overflow-hidden web:rounded-xl';

export function rowClassName(closing?: boolean, endsSection?: boolean): string {
  return cn(
    'web:transition-opacity web:duration-150',
    flatRow,
    endsSection ? 'web:mb-4.5' : 'web:mb-0.5',
    closing && 'opacity-0',
  );
}

// A row's place in its Project's section decides the space below it.
export function useRowClassName(closing?: boolean): string {
  const { position } = use(ListContext);

  return rowClassName(closing, position === 'last' || position === 'only');
}

// A heading sits 2 below the list's top or the previous Project, 4 above its rows; collapsed, 20 above the next heading.
export function headingClassName(collapsed: boolean): string {
  return cn('web:mr-1.5 web:pt-0.5', collapsed ? 'web:mb-4.5' : 'web:mb-1');
}

// The empty Project's line ends its section as a last row does.
export const emptyRowClassName = 'web:mr-1.5 web:mb-4.5';
