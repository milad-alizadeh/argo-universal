import { createContext } from 'react';

/*
 * Where a Screen's aside draws: its own column at the right, a row of Pills under the title, or, where even that is
 * short of room, Pills that show their icon alone.
 */
export type AsidePlace = 'aside' | 'pills' | 'icons';

/*
 * Where a Screen's aside put the read-only FieldGroup it holds. List look knows the window's width, not the Screen's:
 * only the Screen's measured width knows whether the aside has a column of its own. Null anywhere but an aside.
 */
export const AsidePlaceContext = createContext<AsidePlace | null>(null);
