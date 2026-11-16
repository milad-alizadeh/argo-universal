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
import type { SectionCard, SessionSection } from './session-section';

// A pull request's row opens it on its code host, through the App's external-link opener.
const openPullRequest = ({ url }: SessionPullRequest): void => {
  if (url) void Linking.openURL(url);
};

const changesSummary = (content: SessionInspectorContent): ReactNode => (
  <WorkbenchChangesSummary
    pullRequests={pullRequestsOf(content)}
    summary={summaryOf(content)}
    onOpenChange={openPullRequest}
  />
);

/*
 * With pull requests, each row opens its own pull request and the card opens nothing; without, the whole body opens the
 * Checkout's changed files.
 */
const changesCard: SessionSection['card'] = (content, tab): SectionCard => {
  const summary = changesSummary(content);

  return pullRequestsOf(content).length
    ? { summary }
    : { summary, onOpen: tab.open };
};

const pullRequestRows = (content: SessionInspectorContent): ReactNode => {
  const pullRequests = pullRequestsOf(content);

  return (
    pullRequests.length > 0 && (
      <ChangeRows changes={pullRequests} onOpenChange={openPullRequest} />
    )
  );
};

// A phone's sheet leads with every pull request the Session has, scrolling with the Checkout's files under them.
const phoneBody = (content: SessionInspectorContent): ReactNode => {
  const header = pullRequestRows(content) || undefined;

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
  phone: (content) => ({
    sheetHeader: <ChangesSheetHeader />,
    body: phoneBody(content),
  }),
};
