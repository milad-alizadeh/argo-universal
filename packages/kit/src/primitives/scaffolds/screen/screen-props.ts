import { type HeaderDeclaration } from '#primitives/actions/action';
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

// What a Screen's header pieces draw from: its props and the header they declare, read once.
export type ScreenHeaderInput = ScreenProps & {
  declaration: HeaderDeclaration;
};

// What an adapter draws a header from: the Screen's header and the site its plan chose for it.
export type ScreenHeaderPlanned = ScreenHeaderInput & { plan: HeaderPlan };
