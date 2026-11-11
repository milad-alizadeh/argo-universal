import { Text } from '@repo/kit/primitives/content/text';
import { List } from '@repo/kit/primitives/lists/list';
import { ListItem } from '@repo/kit/primitives/lists/list-item';
import type { SessionPluginCard } from './plugin-card-section';

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
    icon: { sf: 'ticket', material: 'confirmation_number' },
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
    icon: { sf: 'ticket', material: 'confirmation_number' },
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
