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

export const ListLookContext = createContext<ListLook | null>(null);

type Declared = Pick<
  ListLookInput,
  'appearance' | 'groupedOnPhones' | 'onPhones' | 'fit'
>;

const lookOf = (
  declared: Declared,
  menu: boolean,
  sidebar: boolean,
): ListLook =>
  resolveListLook({ ...declared, platform: Platform.OS, menu, sidebar });

// A List resolves its look once, from what it declares and where it sits, and provides it to everything it draws.
export function useDeclaredListLook(declared: Declared): ListLook {
  const { appearance, groupedOnPhones, onPhones, fit } = declared;
  const menu = useInMenu();
  const sidebar = useInSidebar();

  return useMemo(
    () => lookOf({ appearance, groupedOnPhones, onPhones, fit }, menu, sidebar),
    [appearance, groupedOnPhones, onPhones, fit, menu, sidebar],
  );
}

const outsideLooks = new Map<string, ListLook>();

// Outside a List a part draws plain, in whichever popover or sidebar holds it.
function outsideLook(menu: boolean, sidebar: boolean): ListLook {
  const key = `${menu}-${sidebar}`;
  const known = outsideLooks.get(key);

  if (known) return known;

  const look = lookOf({ appearance: 'plain' }, menu, sidebar);
  outsideLooks.set(key, look);

  return look;
}

export function useListLook(): ListLook {
  const provided = use(ListLookContext);
  const menu = useInMenu();
  const sidebar = useInSidebar();

  return provided ?? outsideLook(menu, sidebar);
}

export function useSectionDrawing(): SectionDrawing {
  const look = useListLook();

  return useInChoiceMenu() ? look.choosingSection : look.section;
}
