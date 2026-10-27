import { createContext, use, useMemo } from 'react';
import { Platform } from 'react-native';
import {
  type ListLook,
  type ListLookInput,
  resolveListLook,
} from './list-look';
import type { SectionDrawing } from './list-look-section';
import { useListPlace } from './list-place';
import { useWide } from './use-wide/use-wide';

export const ListLookContext = createContext<ListLook | null>(null);

type Declared = Pick<
  ListLookInput,
  'appearance' | 'density' | 'onPhones' | 'fit'
>;

type Where = Pick<ListLookInput, 'place' | 'wide'>;

const lookOf = (declared: Declared, where: Where, inList: boolean): ListLook =>
  resolveListLook({ ...declared, ...where, inList, platform: Platform.OS });

function useWhere(): Where {
  const place = useListPlace();
  const wide = useWide();

  return useMemo(() => ({ place, wide }), [place, wide]);
}

// A List resolves its look once, from what it declares and where it sits, and provides it to everything it draws.
export function useDeclaredListLook(declared: Declared): ListLook {
  const { appearance, density, onPhones, fit } = declared;
  const where = useWhere();

  return useMemo(
    () => lookOf({ appearance, density, onPhones, fit }, where, true),
    [appearance, density, onPhones, fit, where],
  );
}

const outsideLooks = new Map<string, ListLook>();

// Outside a List a part draws plain, in whichever place holds it.
function outsideLook({ place, wide }: Where): ListLook {
  const key = `${place}-${wide}`;
  const held = outsideLooks.get(key);

  if (held) return held;

  const look = lookOf(
    { appearance: 'plain', density: 'regular' },
    { place, wide },
    false,
  );

  outsideLooks.set(key, look);

  return look;
}

/*
 * The look of the List that holds this part, or a plain one where it sits in no List. A part whose place is not its
 * List's (a popover opened from a row) draws by its own place.
 */
export function useListLook(): ListLook {
  const provided = use(ListLookContext);
  const where = useWhere();

  return provided?.place === where.place ? provided : outsideLook(where);
}

export const useSectionDrawing = (): SectionDrawing => useListLook().section;

// A row that asks for the sidebar's drawing is one line at every width.
export function useCompactRows(sidebar?: boolean): boolean {
  const { compact, compactSidebarRows } = useListLook();

  return sidebar === true ? compactSidebarRows : compact;
}

// How far a Screen heading over grouped cards moves in, so a narrow web heading starts on the cards' rows' text.
export function useCardHeadingInset(grouped: boolean): number {
  const where = useWhere();

  return grouped
    ? lookOf({ appearance: 'grouped', density: 'regular' }, where, false)
        .headingInset
    : 0;
}
