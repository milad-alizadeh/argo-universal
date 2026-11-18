import { Button } from '@repo/kit/primitives/actions/button';
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
const checkoutRowsOf = (
  content: SessionInspectorContent,
  tab: SectionTabHandle,
): SessionPullRequest[] =>
  withCheckoutFiles(
    pullRequestsOf(content),
    content.changes?.onComparisonChange,
    tab.open,
  );

const changesSummary = (
  content: SessionInspectorContent,
  tab: SectionTabHandle,
): ReactNode => (
  <WorkbenchChangesSummary
    pullRequests={checkoutRowsOf(content, tab)}
    summary={summaryOf(content)}
    onOpenChange={openPullRequest}
  />
);

/*
 * With pull requests, each row opens its own pull request and the card opens nothing; without, the diff totals open the
 * Checkout's changed files.
 */
const changesCard: SessionSection['card'] = (content, tab): SectionCard => {
  const summary = changesSummary(content, tab);

  if (pullRequestsOf(content).length) return { summary };

  const action = content.createPullRequest;

  return {
    summary,
    onOpen: tab.open,
    trailing: action && (
      <Button label="Create PR" variant="secondary" size="sm" {...action} />
    ),
  };
};

const pullRequestRows = (
  content: SessionInspectorContent,
  tab: SectionTabHandle,
): ReactNode => {
  const pullRequests = checkoutRowsOf(content, tab);

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
