import type { ReactNode } from 'react';
import { ChangesFiles, ChangesSheetHeader } from '#features/changes';
import {
  type SessionPullRequest,
  WorkbenchChangesSummary,
  WorkbenchMoreChanges,
} from '#features/sessions';
import { SessionChangesTab } from '../session-changes-tab';
import type { SessionInspectorContent } from '../session-inspector-content';
import { changesFacts, pullRequestsOf, summaryOf } from './changes-facts';
import type {
  SectionCard,
  SectionTabHandle,
  SessionSection,
} from './session-section';

// The list, started over: no Change selected.
const openList = (
  { changeSelection }: SessionInspectorContent,
  tab: SectionTabHandle,
): (() => void) => {
  return () => {
    changeSelection?.back();
    tab.request();
  };
};

// A row's own Change, selected by its identity and shown in full.
const openChange =
  (
    { changeSelection }: SessionInspectorContent,
    tab: SectionTabHandle,
  ): ((change: SessionPullRequest) => void) =>
  (change) => {
    changeSelection?.select(change);
    tab.request();
  };

const changesSummary = (
  content: SessionInspectorContent,
  tab: SectionTabHandle,
): ReactNode => (
  <WorkbenchChangesSummary
    pullRequests={pullRequestsOf(content)}
    summary={summaryOf(content)}
    onOpen={openList(content, tab)}
    onOpenChange={openChange(content, tab)}
  />
);

/*
 * With pull requests, the card's rows and its footer each open their Change's detail, even after Files was picked;
 * without, the whole body opens the changed files.
 */
const changesCard: SessionSection['card'] = (content, tab): SectionCard => {
  const pullRequests = pullRequestsOf(content);
  const summary = changesSummary(content, tab);

  if (!pullRequests.length) return { summary, onOpen: tab.open };

  return {
    summary,
    footer: (
      <WorkbenchMoreChanges
        changes={pullRequests}
        onOpen={openList(content, tab)}
      />
    ),
  };
};

// Whether the tab leads with the Changes (the list, or where to find one) rather than the changed files alone.
const hasChanges = (content: SessionInspectorContent): boolean =>
  pullRequestsOf(content).length > 0 || content.changeActions !== undefined;

// A Change's own header leads its detail; without one, the files take the Changes header.
const changesSheetHeader = (content: SessionInspectorContent): ReactNode =>
  hasChanges(content) ? undefined : <ChangesSheetHeader />;

const changesBody = (
  content: SessionInspectorContent,
  tab: SectionTabHandle,
): ReactNode => (
  <SessionChangesTab
    changes={content.changes}
    header={content.header}
    changesRequest={tab.requested}
    selection={content.changeSelection}
    actions={content.changeActions}
  />
);

// With Changes, a phone gets the same list, detail and Files as the Inspector; without, the changed files.
const phoneBody = (
  content: SessionInspectorContent,
  tab: SectionTabHandle,
): ReactNode =>
  hasChanges(content)
    ? changesBody(content, tab)
    : content.changes && <ChangesFiles {...content.changes} />;

export const changesSection: SessionSection = {
  ...changesFacts,
  card: changesCard,
  tab: (content, tab) => ({
    body: changesBody(content, tab),
    sheetHeader: changesSheetHeader(content),
  }),
  phone: (content, tab) => ({
    sheetHeader: changesSheetHeader(content),
    body: phoneBody(content, tab),
  }),
};
