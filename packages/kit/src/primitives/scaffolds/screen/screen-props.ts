import type { ReactNode } from 'react';
import {
  type ActionGroup,
  type HeaderDeclaration,
  type ScreenHeader,
} from '#primitives/actions/action';
import type { KitProps } from '../../kit-props';
import type { HeaderPlan } from './header-site';

/*
 * Kit-only, as `testID`. `title` is optional here, where a page's header is empty until it has a name, as New Session's
 * is; a Plugin always names its screen. `onBack` draws a wide drill-in page's Back; a phone's stack header draws its own.
 */
export type ScreenProps = Omit<KitProps<'Screen'>, 'title'> & {
  title?: string;
  testID?: string;
  onFocus?: () => void;
  onBlur?: () => void;
  onBack?: () => void;
};

// The header finished once for the two rooms a Screen can draw it in: its own heading, and the platform's stack and FAB.
export interface ScreenHeaders {
  heading: ScreenHeader;
  native: ScreenHeader;
}

/*
 * The page's options behind its one Options button, open or closed. `anchored` when the Screen draws its own heading,
 * which then holds the sheet on its button, a popover on a wide window; a navigator's header only opens it, and the
 * Screen holds the sheet.
 */
export interface PageOptions {
  content: ReactNode;
  badge?: ScreenProps['optionsBadge'];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  anchored: boolean;
}

// What a Screen's header pieces draw from: its props, and the header they declare and finish, read once.
export type ScreenHeaderInput = ScreenProps & {
  declaration: HeaderDeclaration;
  headers: ScreenHeaders;
  // The title's menu, read from `titleMenu`; empty when the title is plain text.
  titleGroups: ActionGroup[];
  pageOptions: PageOptions | null;
};

// What an adapter draws a header from: the Screen's header and the site its plan chose for it.
export type ScreenHeaderPlanned = ScreenHeaderInput & { plan: HeaderPlan };
