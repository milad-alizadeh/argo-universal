import type { IconName } from '@repo/contracts/kit-symbols';
import type { ReactElement, ReactNode } from 'react';
import type { PressableProps, StyleProp, ViewStyle } from 'react-native';
import type { KitProps } from '../../kit-props';

// The heights a sheet can rest at: SwiftUI's presentation detents, Material's partial and full expansion.
export type SheetDetent = NonNullable<KitProps<'Sheet'>['detents']>[number];

// Kit-only: native presentation, trigger, scrolling, footer and close lifecycle.
export type SheetProps = KitProps<'Sheet'> & {
  style?: StyleProp<ViewStyle>;
  onClosed?: () => void;
  trigger?: ReactElement<
    Pick<PressableProps, 'onPress'> & { disabled?: boolean | null }
  >;
  bottomEdge?: boolean;
  // A detached phone sheet, inset from the screen edges, as the Session's Git sheet.
  floating?: boolean;
  // The pages scroll themselves, as a FieldGroup does, so the sheet gives them its height and wraps them in no scroller of its own; a page may say otherwise.
  contentScrolls?: boolean;
  footer?: ReactNode;
  // Pads composed content, such as a form or a Plugin's, with the standard sheet inset; lists and pages that draw their own margins, a FieldGroup among them, leave it off.
  inset?: boolean;
  /*
   * A centred card wide enough for a page that sets two columns beside each other, as Pair a Device does;
   * a window too narrow for it keeps the card to the window, and a drawer has no width of its own to widen.
   */
  wide?: boolean;
};

export interface SheetScreenProps {
  name: string;
  onExit?: () => void;
  // Shown in the page's title row; a pushed page also gets a back button.
  title?: string;
  // The page's one header action, at the trailing end of its title row.
  action?: SheetScreenAction;
  /*
   * The rows the page stands in for while it slides in, as bars of the width its own rows will take.
   * Android draws it; the platforms whose pages are drawn before they move never need it.
   */
  placeholder?: ReactNode;
  children: ReactNode;
}

// An action in a page's header, such as Stop; destructive draws it in the danger colour. With an icon it is an icon button named by its label.
export interface SheetScreenAction {
  label: string;
  onPress: () => void;
  destructive?: boolean;
  icon?: IconName;
}

// A row that pushes another page of the same sheet.
export interface SheetLinkProps {
  to: string;
  label: string;
  value?: string;
  valueLeading?: ReactElement;
}

// A caller can supply a page when its choices are only known when the field opens.
export interface SheetDestination extends SheetScreenProps {
  contentScrolls?: boolean;
  /*
   * Whether the sheet carries the page from the moment it opens rather than mounting it on the way in.
   * A page on standby is already drawn when it is pushed, so pushing it is a slide and nothing else.
   */
  standby?: boolean;
}

export interface SheetNavigation {
  push: (page: string | SheetDestination) => void;
  // Hands the sheet a page to carry unpushed, so the push that follows has nothing left to mount.
  standby: (page: SheetDestination) => void;
  update: (page: SheetDestination) => void;
  back: () => void;
  close: () => void;
}
