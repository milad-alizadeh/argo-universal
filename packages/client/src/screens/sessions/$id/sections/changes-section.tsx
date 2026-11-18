import type { ReactNode } from 'react';
import { Linking } from 'react-native';
import { ChangesFiles, ChangesSheetHeader } from '#features/changes';
import {
  ChangeRows,
  type SessionPullRequest,
  WorkbenchChangesSummary,
} from '#features/sessions';
import { SessionChangesTab } from '../session-changes-tab';
import type { SessionInspectorContent } from '../session-inspector-content';
import { changesFacts, pullRequestsOf, summaryOf } from './changes-facts';
import { withCheckoutFiles } from './checkout-files';
import type {
  SectionCard,
  SectionTabHandle,
  SessionSection,
} from './session-section';

// A pull request's row opens it on its code host, through the App's external-link opener.
const openPullRequest = ({ url }: SessionPullRequest): void => {
  if (url) void Linking.openURL(url);
};

// The pull requests as rows draw them: the one on the Checkout opens its files in the Changes tab.
const rowsOf = (
  content: SessionInspectorContent,
  tab: SectionTabHandle,
): SessionPullRequest[] =>
  withCheckoutFiles(pullRequestsOf(content), content.changes, tab.open);

const changesSummary = (
  content: SessionInspectorContent,
  tab: SectionTabHandle,
): ReactNode => (
  <WorkbenchChangesSummary
    pullRequests={rowsOf(content, tab)}
    summary={summaryOf(content)}
    onOpenChange={openPullRequest}
  />
);

/*
 * With pull requests, each row opens its own pull request and the card opens nothing; without, the whole body opens the
 * Checkout's changed files.
 */
const changesCard: SessionSection['card'] = (content, tab): SectionCard => {
  const summary = changesSummary(content, tab);

  return pullRequestsOf(content).length
    ? { summary }
    : { summary, onOpen: tab.open };
};

const pullRequestRows = (
  content: SessionInspectorContent,
  tab: SectionTabHandle,
): ReactNode => {
  const pullRequests = rowsOf(content, tab);

  return (
    pullRequests.length > 0 && (
      <ChangeRows changes={pullRequests} onOpenChange={openPullRequest} />
    )
  );
};

// A phone's sheet leads with every pull request the Session has, scrolling with the Checkout's files under them.
const phoneBody = (
  content: SessionInspectorContent,
  tab: SectionTabHandle,
): ReactNode => {
  const header = pullRequestRows(content, tab) || undefined;

  return content.changes ? (
    <ChangesFiles {...content.changes} header={header} />
  ) : (
    header
  );
};

export const changesSection: SessionSection = {
  ...changesFacts,
  card: changesCard,
  tab: ({ changes }) => ({
    body: <SessionChangesTab changes={changes} />,
    sheetHeader: <ChangesSheetHeader />,
  }),
  phone: (content, tab) => ({
    sheetHeader: <ChangesSheetHeader />,
    body: phoneBody(content, tab),
  }),
};
