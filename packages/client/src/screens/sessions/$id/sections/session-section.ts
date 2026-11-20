import type { SessionSnapshot } from '@repo/contracts';
import type { InspectorTab } from '@repo/kit/primitives/scaffolds/inspector';
import type { IconSymbol } from '@repo/kit/symbols/icon-symbol';
import type { ReactNode } from 'react';
import type { WorkbenchSection } from '#features/sessions';
import type { SessionInspectorContent } from '../session-inspector-content';

// What decides which Sections a Session offers, read from its snapshot or from the page's props alike.
export type SessionItems = Partial<
  Pick<SessionSnapshot, 'subagents' | 'shells'>
> & { scheduleCount?: number };

// What a Section is, before anything draws it: its name, and what the Session has in it.
export interface SectionFacts {
  // Its Inspector tab's key and its Workbench card's id.
  key: string;
  title: string;
  // One of Argo's icons, or a Plugin's own symbol pair for the card it adds.
  icon: IconSymbol;
  // A Section that isn't offered has no Inspector tab, and an open one closes.
  offered: (items: SessionItems) => boolean;
  // What the Section counts. A Plugin can supply a card without a count.
  count?: (content: SessionInspectorContent) => number;
}

// One Section's Inspector tab, bound to the Session's tabs.
export interface SectionTabHandle {
  open: () => void;
  // Shows the tab and asks it to start over at its first page.
  request: () => void;
  // How often it was asked; the tab starts over at each.
  requested?: number;
}

export type SectionCard = Pick<
  WorkbenchSection,
  'summary' | 'trailing' | 'footer' | 'onOpen' | 'noRows'
>;

export interface SectionTab extends Pick<InspectorTab, 'count' | 'countTone'> {
  body: ReactNode;
  sheetHeader?: ReactNode;
}

// A Section on a phone's Inspector sheet.
export interface SectionPhonePage {
  sheetHeader: ReactNode;
  body: ReactNode;
}

type SectionDraw<Drawn> = (
  content: SessionInspectorContent,
  tab: SectionTabHandle,
) => Drawn;

// A Session's Section: a Workbench card that summarises it and an Inspector tab that shows it in full (ADR-0039).
export interface SessionSection extends SectionFacts {
  card: SectionDraw<SectionCard>;
  tab: SectionDraw<SectionTab>;
  // Absent where the Section draws its own phone sheet, as Agents and Background Tasks do.
  phone?: SectionDraw<SectionPhonePage>;
}

export const offeredFacts = <Section extends SectionFacts>(
  sections: readonly Section[],
  items: SessionItems,
): Section[] => sections.filter((section) => section.offered(items));

export const offeredKeys = (
  sections: readonly SectionFacts[],
  items: SessionItems,
): string[] => offeredFacts(sections, items).map((section) => section.key);

// The page's props carry the same items the snapshot does.
export const itemsOf = (content: SessionInspectorContent): SessionItems => ({
  subagents: content.subagents?.subagents,
  scheduleCount: scheduleCount(content),
  shells: content.shells?.shells,
});

// A Section draws a Workbench card only while it is offered and has something to count.
export const drawsCard = (
  { offered, count = () => 1 }: SectionFacts,
  content: SessionInspectorContent,
): boolean => offered(itemsOf(content)) && count(content) > 0;

const scheduleCount = (content: SessionInspectorContent): number =>
  content.schedules?.items.length ?? 0;
