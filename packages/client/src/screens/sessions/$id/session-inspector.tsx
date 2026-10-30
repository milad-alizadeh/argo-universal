import {
  Inspector,
  type InspectorProps,
  type InspectorTab,
} from '@repo/kit/primitives/scaffolds/inspector';
import { SizeClass } from '@repo/kit/size-class/size-class';
import { createElement, type JSX } from 'react';
import type { SessionPanels } from '#features/sessions';
import {
  itemsOf,
  type SectionPhonePage,
  type SectionTab,
  type SessionSection,
} from './sections/session-section';
import {
  offeredSections,
  sectionOf,
  sectionTab,
  sessionSections,
} from './sections/session-sections';
import type { SessionInspectorContent } from './session-inspector-content';
import { RetainedInspectorPages } from './session-inspector-pages';

export type { SessionInspectorContent } from './session-inspector-content';

export const offeredSessionPanels = (
  content: SessionInspectorContent,
): string[] => offeredSections(itemsOf(content), content.pluginCards);

type SessionInspectorProps = SessionInspectorContent & {
  panels: SessionPanels;
};

const tabOf = (
  props: SessionInspectorProps,
  section: SessionSection,
): SectionTab => section.tab(props, sectionTab(props.panels, section.key));

function tabItem(props: SessionInspectorProps, key: string): InspectorTab[] {
  const section = sectionOf(props, key);

  if (!section) return [];

  const { count, countTone } = tabOf(props, section);

  return [{ key, label: section.title, icon: section.icon, count, countTone }];
}

function inspectorTabs(props: SessionInspectorProps): InspectorProps['tabs'] {
  const { panels } = props;

  return {
    items: panels.state.tabs.flatMap((key) => tabItem(props, key)),
    selected: panels.state.shown ?? '',
    onSelect: panels.select,
    onClose: panels.close,
  };
}

const shownSection = (
  props: SessionInspectorProps,
): SessionSection | undefined =>
  props.panels.state.shown === undefined
    ? undefined
    : sectionOf(props, props.panels.state.shown);

// The shown Section names the Inspector and leads its sheet.
function shownHeading(
  props: SessionInspectorProps,
): Pick<InspectorProps, 'title' | 'sheetHeader'> {
  const shown = shownSection(props);

  if (!shown) return { title: '' };

  return { title: shown.title, sheetHeader: tabOf(props, shown).sheetHeader };
}

const inspectorProps = (props: SessionInspectorProps): InspectorProps => ({
  ...shownHeading(props),
  open: props.panels.state.tabs.length > 0,
  onOpenChange: (open) => !open && props.panels.closeAll(),
  tabs: inspectorTabs(props),
});

// The Session's Inspector: a tab for each Section opened, showing one at a time.
export function SessionInspector(props: SessionInspectorProps): JSX.Element {
  return (
    <SizeClass compact={phoneInspector(props)} wide={wideInspector(props)} />
  );
}

/*
 * A phone's Inspector is the sheet of a Section that has one; a Section that draws its own phone sheet shows none here.
 * While closed it keeps the first such Section's page, so the sheet slides away with its content.
 */
const phoneSection = (
  props: SessionInspectorProps,
): SessionSection | undefined =>
  props.panels.state.shown === undefined
    ? sessionSections(props).find((section) => section.phone)
    : shownSection(props);

const phonePage = (
  props: SessionInspectorProps,
): SectionPhonePage | undefined => {
  const section = phoneSection(props);

  return section?.phone?.(props, sectionTab(props.panels, section.key));
};

function phoneInspector(props: SessionInspectorProps): JSX.Element | null {
  const page = phonePage(props);

  if (!page) return null;

  return createElement(
    Inspector,
    {
      ...inspectorProps(props),
      sheetHeader: page.sheetHeader,
      contentScrolls: true,
    },
    page.body,
  );
}

// Open tabs retain their actual content trees, including virtualised detail scroll and local selection.
function wideInspector(props: SessionInspectorProps): JSX.Element {
  const inspector = inspectorProps(props);

  return createElement(
    Inspector,
    { ...inspector, toolbar: undefined, contentScrolls: true },
    <RetainedInspectorPages {...props} inspector={inspector} />,
  );
}
