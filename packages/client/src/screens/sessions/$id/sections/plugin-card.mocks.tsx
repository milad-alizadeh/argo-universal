import { Text } from '@repo/kit/primitives/content/text';
import { FieldGroup } from '@repo/kit/primitives/fields/field-group';
import { List } from '@repo/kit/primitives/lists/list';
import { ListItem } from '@repo/kit/primitives/lists/list-item';
import type { SessionPluginCard } from './plugin-card-section';

const ticketIcon = { sf: 'ticket', material: 'confirmation_number' } as const;

export const issueCardSummary = '#412 · In review';

export const issueCardFullView = 'Every comment on #412';

export const coverageCardSummary = '78% of lines covered';

/*
 * What a Plugin's Workbench card holds: the Plugin's own page, which the Server sends as a kit tree and the App
 * draws. A story passes the drawn page, as the Session does.
 */
export const issueTrackerCard: SessionPluginCard = {
  pluginId: 'issue-tracker',
  card: {
    id: 'issue',
    title: 'Issue',
    icon: ticketIcon,
    page: '/issues/session',
    tab: '/issues/session/full',
  },
  page: <Text>{issueCardSummary}</Text>,
  tab: <Text>{issueCardFullView}</Text>,
};

// A card the Plugin gave no full view: it stays a card and opens no Inspector tab.
export const coverageCard: SessionPluginCard = {
  pluginId: 'coverage',
  card: {
    id: 'coverage',
    title: 'Coverage',
    icon: { material: 'percent' },
    page: '/coverage/session',
  },
  page: <Text>{coverageCardSummary}</Text>,
};

export const listCardRow = 'Fix the tracker card';

// A card whose page is a List of rows that press nothing of their own, so the card's body is what a press on a row opens.
export const listCard: SessionPluginCard = {
  pluginId: 'issue-tracker',
  card: {
    id: 'rows',
    title: 'Rows',
    icon: ticketIcon,
    page: '/issues/rows',
    tab: '/issues/rows/full',
  },
  page: (
    <List testID="rows-list">
      <ListItem title={listCardRow} />
    </List>
  ),
  tab: <Text>{issueCardFullView}</Text>,
};

const noop = (): void => {};

export const sessionRowTitle = 'Work on the tracker card for the Workbench';

export const sessionRowBranch = 'argo/c17-workbench-card-style';

// A card whose page is a List of FieldGroup.Link rows, as the Issue tracker's Sessions list is: a long title and a long branch.
export const sessionsCard: SessionPluginCard = {
  pluginId: 'issue-tracker',
  card: {
    id: 'sessions',
    title: 'Sessions',
    icon: ticketIcon,
    page: '/issues/sessions',
  },
  page: (
    <List appearance="grouped">
      <List.Section title="Sessions">
        <FieldGroup.Link
          id="session-one"
          title={sessionRowTitle}
          value={sessionRowBranch}
          onPress={noop}
        />
      </List.Section>
    </List>
  ),
};
