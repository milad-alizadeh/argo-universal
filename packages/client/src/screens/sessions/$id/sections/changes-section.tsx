import type { ReactNode } from 'react';
import { ChangesFiles, ChangesSheetHeader } from '#features/changes';
import {
  WorkbenchChangesSummary,
  WorkbenchMoreChanges,
} from '#features/sessions';
import { SessionChangesStage } from '../session-changes-stage';
import type { SessionInspectorContent } from '../session-inspector-content';
import { changesFacts, pullRequestsOf, summaryOf } from './changes-facts';
import type {
  SectionCard,
  SectionTabHandle,
  SessionSection,
} from './session-section';

const changesSummary = (
  content: SessionInspectorContent,
  tab: SectionTabHandle,
): ReactNode => (
  <WorkbenchChangesSummary
    pullRequests={pullRequestsOf(content)}
    summary={summaryOf(content)}
    onOpen={tab.request}
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
      <WorkbenchMoreChanges changes={pullRequests} onOpen={tab.request} />
    ),
  };
};

// A Change's own header leads its detail; without one, the files take the Changes header.
const changesSheetHeader = (content: SessionInspectorContent): ReactNode =>
  pullRequestsOf(content).length ? undefined : <ChangesSheetHeader />;

export const changesSection: SessionSection = {
  ...changesFacts,
  card: changesCard,
  tab: (content, tab) => ({
    body: (
      <SessionChangesStage
        changes={content.changes}
        header={content.header}
        changesRequest={tab.requested}
      />
    ),
    sheetHeader: changesSheetHeader(content),
  }),
  phone: ({ changes }) => ({
    sheetHeader: <ChangesSheetHeader />,
    body: changes && <ChangesFiles {...changes} />,
  }),
};
