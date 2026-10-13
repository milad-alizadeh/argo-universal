import type * as React from 'react';
import {
  type Dispatch,
  type ReactNode,
  type RefObject,
  type SetStateAction,
  useEffect,
  useRef,
  useState,
} from 'react';
import type { NavigationDestination } from '#lib/product/navigation/context';
import {
  type Section,
  sectionDestination,
  sectionOf,
} from '../../../lib/product/navigation/sections';
import { PhoneShell, type PhoneShellProps } from './phone-shell/phone-shell';

export interface PhoneLayoutViewProps {
  destination: NavigationDestination;
  // The Sessions that need input or are Unread, for the drawer's badge.
  attentionCount: number;
  // Shows a picked section.
  onSectionChange: (section: Section) => void;
  // Floats just under the section's header.
  banner?: ReactNode;
  children: ReactNode;
}

type SetDrawerOpen = Dispatch<SetStateAction<boolean>>;

type SectionDrawer = Pick<
  PhoneShellProps,
  'drawerOpen' | 'onDrawerOpenChange' | 'onSectionChange'
>;

interface SectionPick {
  section: Section;
  onSectionChange: (section: Section) => void;
}

function useCloseOnSectionMount(
  section: Section,
  setDrawerOpen: SetDrawerOpen,
): void {
  const shownSection = useRef(section);
  useEffect(() => {
    if (shownSection.current === section) return;
    shownSection.current = section;
    const frame = requestAnimationFrame(() => setDrawerOpen(false));
    return (): void => cancelAnimationFrame(frame);
  }, [section, setDrawerOpen]);
}

function useDeferredClose(setDrawerOpen: SetDrawerOpen): {
  deferClose: RefObject<boolean>;
  onDrawerOpenChange: (open: boolean) => void;
} {
  const deferClose = useRef(false);
  return {
    deferClose,
    onDrawerOpenChange: (open) => {
      if (!open && deferClose.current) deferClose.current = false;
      else setDrawerOpen(open);
    },
  };
}

function pickSection(
  { section, onSectionChange }: SectionPick,
  deferClose: RefObject<boolean>,
): (next: Section) => void {
  return (next) => {
    if (next === section) return;
    deferClose.current = true;
    onSectionChange(next);
  };
}

// Mounting the next section stalls the first frame, so a picked section's drawer shuts once it has mounted.
function useSectionDrawer(pick: SectionPick): SectionDrawer {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { deferClose, onDrawerOpenChange } = useDeferredClose(setDrawerOpen);
  useCloseOnSectionMount(pick.section, setDrawerOpen);
  return {
    drawerOpen,
    onDrawerOpenChange,
    onSectionChange: pickSection(pick, deferClose),
  };
}

// The phone's shell: one drawer for every section, so picking a section animates it shut over the new list.
export function PhoneLayoutView({
  destination,
  ...shell
}: PhoneLayoutViewProps): React.JSX.Element {
  const section = sectionOf(destination);
  const drawer = useSectionDrawer({ ...shell, section });
  return (
    <PhoneShell
      {...shell}
      {...drawer}
      selectedSection={section}
      swipeEnabled={destination.to === sectionDestination(section).to}
    />
  );
}
