import {
  Children,
  createContext,
  isValidElement,
  useContext,
  useMemo,
  useState,
  type Dispatch,
  type ReactElement,
  type ReactNode,
  type SetStateAction,
} from 'react';
import { ListItem } from '#primitives/lists/list-item';
import {
  pushDestination,
  registerDestination,
  updateDestination,
  useScreenExits,
} from './sheet-destinations';
import type {
  SheetLinkProps,
  SheetNavigation,
  SheetScreenAction,
  SheetScreenProps,
  SheetProps,
} from './sheet-props';
import {
  popScreen,
  sheetReports,
  useLatest,
  type SheetReports,
} from './sheet-state';

// Marks one page of a sheet; each platform's stack draws it.
export function SheetScreen(props: SheetScreenProps): ReactNode {
  return props.children;
}

export interface SheetScreenEntry {
  name: string;
  title?: string;
  action?: SheetScreenAction;
  placeholder?: ReactNode;
  content: ReactNode;
  contentScrolls?: boolean;
  onExit?: () => void;
  // Drawn from the moment the sheet opens, so pushing it moves a page that is already there.
  standby?: boolean;
}

// The sheet's Sheet.Screen children, the first one its root, so a sheet of one Sheet.Screen has one page, which carries the title the stack draws.
function sheetScreens(children: ReactNode): SheetScreenEntry[] {
  return Children.toArray(children)
    .filter(isScreen)
    .map((page) => ({
      name: page.props.name,
      title: page.props.title,
      action: page.props.action,
      placeholder: page.props.placeholder,
      onExit: page.props.onExit,
      content: page.props.children,
    }));
}

function isScreen(child: ReactNode): child is ReactElement<SheetScreenProps> {
  return isValidElement(child) && child.type === SheetScreen;
}

const SheetContext = createContext<SheetNavigation | undefined>(undefined);

export const SheetNavigationProvider = SheetContext.Provider;

// The pages of the sheet the caller sits in, so a choice can go back once it is made.
export function useSheet(): SheetNavigation {
  const navigation = useOptionalSheet();

  if (!navigation) throw new Error('useSheet must be called inside a Sheet');

  return navigation;
}

// Fields use their containing Sheet when present, otherwise they own a standalone presentation.
export function useOptionalSheet(): SheetNavigation | undefined {
  return useContext(SheetContext);
}

export function SheetLink(props: SheetLinkProps): ReactElement {
  const sheet = useSheet();

  return (
    <ListItem
      disclosure
      title={props.label}
      value={props.value}
      leading={props.valueLeading}

      accessibilityRole="button"
      onPress={() => sheet.push(props.to)}
    />
  );
}

export interface SheetStack {
  pages: SheetScreenEntry[];
  // The pages pushed over the root, in order.
  path: string[];
  setPath: Dispatch<SetStateAction<string[]>>;
  navigation: SheetNavigation;
  reports: SheetReports;
}

export function useSheetStack(props: SheetProps): SheetStack {
  const latest = useLatest(props);
  const presentation = usePresentation(props.open, latest);

  const navigation = useSheetNavigation({
    setPath: presentation.setPath,
    latest,
    setDestinations: presentation.setDestinations,
  });

  const pages = [...sheetScreens(props.children), ...presentation.destinations];
  useScreenExits(props.open, presentation.path, pages);

  return { ...presentation, pages, navigation };
}

type Presentation = Pick<SheetStack, 'path' | 'setPath' | 'reports'> & {
  destinations: SheetScreenEntry[];
  setDestinations: Dispatch<SetStateAction<SheetScreenEntry[]>>;
};

/*
 * Each opening starts on the root page and reports its own close; the old page stays while the sheet slides
 * away. Screens pushed during an opening go with it, since a sheet that kept them would count pages it no
 * longer draws — which is what decides whether Android's sheet fills the window or wraps (owner, 2026-10-20).
 */
function usePresentation(
  open: boolean,
  latest: () => SheetProps,
): Presentation {
  const [path, setPath] = useState<string[]>([]);
  const [destinations, setDestinations] = useState<SheetScreenEntry[]>([]);
  const [reports, setReports] = useState(() => sheetReports(latest));

  if (useOpening(open)) {
    setPath([]);
    setDestinations([]);
    setReports(sheetReports(latest));
  }

  return { path, setPath, destinations, setDestinations, reports };
}

function useOpening(open: boolean): boolean {
  const [shownOpen, setShownOpen] = useState(open);

  if (open !== shownOpen) setShownOpen(open);

  return open && !shownOpen;
}

type NavigationOwners = {
  setPath: Dispatch<SetStateAction<string[]>>;
  latest: () => SheetProps;
  setDestinations: Dispatch<SetStateAction<SheetScreenEntry[]>>;
};

function useSheetNavigation(owners: NavigationOwners): SheetNavigation {
  const { setPath, latest, setDestinations } = owners;

  return useMemo(
    () => navigationFor({ setPath, latest, setDestinations }),
    [setPath, latest, setDestinations],
  );
}

function navigationFor({
  setPath,
  latest,
  setDestinations,
}: NavigationOwners): SheetNavigation {
  return {
    push: (page): void => pushDestination(setDestinations, setPath, page),
    standby: (page): void => registerDestination(setDestinations, page),
    update: (page): void => updateDestination(setDestinations, page),
    back: (): void => setPath(popScreen),
    close: (): void => latest().onOpenChange(false),
  };
}
