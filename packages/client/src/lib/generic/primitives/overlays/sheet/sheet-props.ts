import type { ReactElement, ReactNode } from 'react';
import type { PressableProps, StyleProp, ViewStyle } from 'react-native';

// The heights a sheet can rest at: SwiftUI's presentation detents, Material's partial and full expansion.
export type SheetDetent = 'medium' | 'large';

export interface SheetProps {
  // The trigger's own layout in the row it sits in.
  style?: StyleProp<ViewStyle>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // After the close animation has finished.
  onClosed?: () => void;
  // Absent when the app opens the sheet itself, as a dialog on a narrow window does.
  trigger?: ReactElement<Pick<PressableProps, 'disabled' | 'onPress'>>;
  // The sheet's accessible name.
  label?: string;
  // Without detents the sheet is as tall as its content.
  detents?: SheetDetent[];
  /*
   * The detent the sheet opens at, one of `detents`; the person may still drag it to another.
   * iOS: SwiftUI's detent selection. Android: 'large' opens a half-open sheet fully expanded.
   * Web: ignored, as the drawer rests only at its content's height or the full window.
   */
  initialDetent?: SheetDetent;
  /*
   * Web: stays a drawer on the window's bottom edge, as wide as the window, at every Size class,
   * as the medium window's Inspector does. Native sheets rise from the bottom edge already.
   */
  bottomEdge?: boolean;
  // False while the content holds unsaved input: a swipe, the backdrop, Escape or Back leave the sheet open.
  dismissible?: boolean;
  // Native only: the content owns scrolling and fills the sheet, as a native GroupedList or a long list does.
  contentScrolls?: boolean;
  // Stays in view under the content, such as a request's actions.
  footer?: ReactNode;
  // Sheet.Page children make a sheet with pages, the first one its root; anything else is one page.
  children: ReactNode;
}

export interface SheetPageProps {
  name: string;
  // Shown in the page's title row; a pushed page also gets a back button.
  title?: string;
  children: ReactNode;
}

// A row that pushes another page of the same sheet.
export interface SheetLinkProps {
  to: string;
  label: string;
  value?: string;
  valueLeading?: ReactElement;
}

// A caller can supply a page when its choices are only known when the field opens.
export interface SheetDestination extends SheetPageProps {
  contentScrolls?: boolean;
  onExit?: () => void;
}

export interface SheetNavigation {
  push: (page: string | SheetDestination) => void;
  update: (page: SheetDestination) => void;
  back: () => void;
  close: () => void;
}
