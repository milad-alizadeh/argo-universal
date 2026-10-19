import type { ReactElement, ReactNode } from 'react';
import type { PressableProps, StyleProp, ViewStyle } from 'react-native';
import type { KitProps } from '../../kit-props';

// The heights a sheet can rest at: SwiftUI's presentation detents, Material's partial and full expansion.
export type SheetDetent = NonNullable<KitProps<'Sheet'>['detents']>[number];

// Kit-only: native presentation, trigger, scrolling, footer and close lifecycle.
export type SheetProps = KitProps<'Sheet'> & {
  style?: StyleProp<ViewStyle>;
  onClosed?: () => void;
  trigger?: ReactElement<Pick<PressableProps, 'disabled' | 'onPress'>>;
  bottomEdge?: boolean;
  contentScrolls?: boolean;
  footer?: ReactNode;
  // Pads composed content, such as a form or a Plugin's, with the standard sheet inset; lists and pages that draw their own margins leave it off.
  inset?: boolean;
};

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
