import { createContext, use, useMemo } from 'react';
import { Platform } from 'react-native';
import {
  type ListLook,
  type ListLookInput,
  resolveListLook,
} from './list-look';
import type { SectionDrawing } from './list-look-section';
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

export function useSectionDrawing(): SectionDrawing {
  const look = useListLook();

  return useInChoiceMenu() ? look.choosingSection : look.section;
}

// A compact List's rows draw as one line only on a wide window, and never as a popover's menu rows.
export function useCompactRows(): boolean {
  const { density } = useListLook();
  const menu = useInMenu();
  const wide = useWide();

  return density === 'compact' && wide && !menu;
}
