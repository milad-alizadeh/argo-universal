import {
  Children,
  createContext,
  isValidElement,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type ReactElement,
  type ReactNode,
  type SetStateAction,
} from 'react';
import { GroupedListItem } from '#primitives/lists/grouped-list-item';
import { pushDestination, usePageExits } from './sheet-destinations';
import type {
  SheetDestination,
  SheetLinkProps,
  SheetNavigation,
  SheetPageProps,
  SheetProps,
} from './sheet-props';
import { popPage, sheetReports, type SheetReports } from './sheet-state';

// Marks one page of a sheet; each platform's stack draws it.
export function SheetPage(props: SheetPageProps): ReactNode {
  return props.children;
}

export interface SheetPageEntry {
  name: string;
  title?: string;
  content: ReactNode;
  contentScrolls?: boolean;
  onExit?: () => void;
}

// The sheet's Sheet.Page children, the first one its root; none when the sheet has a single page.
export function sheetPages(children: ReactNode): SheetPageEntry[] {
  return Children.toArray(children)
    .filter(isSheetPage)
    .map((page) => ({
      name: page.props.name,
      title: page.props.title,
      content: page.props.children,
    }));
}

function isSheetPage(child: ReactNode): child is ReactElement<SheetPageProps> {
  return isValidElement(child) && child.type === SheetPage;
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
    <GroupedListItem
      label={props.label}
      value={props.value}
      valueLeading={props.valueLeading}
      disclosure
      accessibilityRole="button"
      onPress={() => sheet.push(props.to)}
    />
  );
}

export interface SheetStack {
  pages: SheetPageEntry[];
  // The pages pushed over the root, in order.
  path: string[];
  setPath: Dispatch<SetStateAction<string[]>>;
  navigation: SheetNavigation;
  reports: SheetReports;
}

export function useSheetStack(props: SheetProps): SheetStack {
  const latest = useLatest(props);
  const presentation = usePresentation(props.open, latest);
  const [destinations, setDestinations] = useState<SheetPageEntry[]>([]);

  const navigation = useSheetNavigation(
    presentation.setPath,
    latest,
    setDestinations,
  );

  const pages = [...sheetPages(props.children), ...destinations];
  usePageExits(props.open, presentation.path, pages);

  return { ...presentation, pages, navigation };
}

type Presentation = Pick<SheetStack, 'path' | 'setPath' | 'reports'>;

// Each opening starts on the root page and reports its own close; the old page stays while the sheet slides away.
function usePresentation(
  open: boolean,
  latest: () => SheetProps,
): Presentation {
  const [path, setPath] = useState<string[]>([]);
  const [reports, setReports] = useState(() => sheetReports(latest));

  if (useOpening(open)) {
    setPath([]);
    setReports(sheetReports(latest));
  }

  return { path, setPath, reports };
}

function useOpening(open: boolean): boolean {
  const [shownOpen, setShownOpen] = useState(open);

  if (open !== shownOpen) setShownOpen(open);

  return open && !shownOpen;
}

function useSheetNavigation(
  setPath: Dispatch<SetStateAction<string[]>>,
  latest: () => SheetProps,
  setDestinations: Dispatch<SetStateAction<SheetPageEntry[]>>,
): SheetNavigation {
  return useMemo(
    () => ({
      push: (page: string | SheetDestination): void =>
        pushDestination(setDestinations, setPath, page),
      back: (): void => setPath(popPage),
      close: (): void => latest().onOpenChange(false),
    }),
    [setPath, latest, setDestinations],
  );
}

// Reads the newest props from callbacks that outlive a render.
function useLatest<Value>(value: Value): () => Value {
  const ref = useRef(value);
  useLayoutEffect(() => {
    ref.current = value;
  });

  return useCallback(() => ref.current, []);
}

export function pageTitle(
  pages: SheetPageEntry[],
  name: string | undefined,
): string | undefined {
  return pages.find((page) => page.name === name)?.title;
}
