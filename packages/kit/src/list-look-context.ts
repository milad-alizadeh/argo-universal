import { createContext, use, useMemo } from 'react';
import { Platform } from 'react-native';
import {
  type ListLook,
  type ListLookInput,
  resolveListLook,
  rowsAreCompact,
} from './list-look';
import { compactSection, type SectionDrawing } from './list-look-section';
import { useInChoiceMenu, useInMenu } from './menu-rows-context';
import { useInSidebar } from './row-drawing-context';
import { useWide } from './use-wide/use-wide';

export const ListLookContext = createContext<ListLook | null>(null);

type Declared = Pick<
  ListLookInput,
  'appearance' | 'density' | 'onPhones' | 'fit'
>;

const lookOf = (
  declared: Declared,
  menu: boolean,
  sidebar: boolean,
): ListLook =>
  resolveListLook({ ...declared, platform: Platform.OS, menu, sidebar });

// A List resolves its look once, from what it declares and where it sits, and provides it to everything it draws.
export function useDeclaredListLook(declared: Declared): ListLook {
  const { appearance, density, onPhones, fit } = declared;
  const menu = useInMenu();
  const sidebar = useInSidebar();

  return useMemo(
    () => lookOf({ appearance, density, onPhones, fit }, menu, sidebar),
    [appearance, density, onPhones, fit, menu, sidebar],
  );
}

// Inside a List's rows, a part that would draw its own List draws a section of it instead.
export const useInList = (): boolean => use(ListLookContext) !== null;

type Held = `${boolean}-${boolean}`;

const outsideLook = (menu: boolean, sidebar: boolean): ListLook =>
  lookOf({ appearance: 'plain', density: 'regular' }, menu, sidebar);

// Outside a List a part draws plain, in whichever popover or sidebar holds it.
const outsideLooks: Record<Held, ListLook> = {
  'false-false': outsideLook(false, false),
  'false-true': outsideLook(false, true),
  'true-false': outsideLook(true, false),
  'true-true': outsideLook(true, true),
};

export function useListLook(): ListLook {
  const provided = use(ListLookContext);
  const menu = useInMenu();
  const sidebar = useInSidebar();

  return provided ?? outsideLooks[`${menu}-${sidebar}`];
}

// A compact List's rows keep their leading edge in; the sidebar's own drawing already sits on its rows.
function useRowsSection(): SectionDrawing {
  const { section } = useListLook();
  const compact = useCompactRows();
  const inSidebar = useInSidebar();

  return compact && !inSidebar ? compactSection(section) : section;
}

// A compact List's section heading starts on its rows' leading edge, where a regular List's starts on its content's.
export function useSectionDrawing(): SectionDrawing {
  const { choosingSection } = useListLook();
  const rows = useRowsSection();

  return useInChoiceMenu() ? choosingSection : rows;
}

/*
 * A compact List's rows draw as one line on a wide window, and never as a popover's menu rows. A sidebar row (its own
 * `sidebar` option, or its List's sidebar drawing) keeps its one line at every web width; phones resolve regular density.
 */
export function useCompactRows(sidebar?: boolean): boolean {
  const { density } = useListLook();
  const inSidebar = useInSidebar();

  return rowsAreCompact(density, {
    menu: useInMenu(),
    wide: useWide(),
    sidebar: sidebar === true || inSidebar,
  });
}
