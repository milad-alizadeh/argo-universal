import { Icon } from '@repo/kit/primitives/content/icon';
import { Text } from '@repo/kit/primitives/content/text';
import { List } from '@repo/kit/primitives/lists/list';
import { EmptyState } from '@repo/kit/primitives/status/empty-state';
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

export const notesRowTitle = 'Draft the release notes';

export const notesFullView = 'Every note on this Session';

// A Plugin's card drawn as a kit List of one row, which presses nothing of its own, with a full view to open.
export const notesListCard: SessionPluginCard = {
  pluginId: 'lists',
  card: {
    id: 'notes',
    title: 'Notes',
    icon: { sf: 'note.text', material: 'notes' },
    page: '/notes',
    tab: '/notes/full',
  },
  page: (
    <List>
      <ListItem
        title={notesRowTitle}
        subtitle="Updated today"
        leading={<Icon name="pending" tone="muted" />}
      />
    </List>
  ),
  tab: <Text>{notesFullView}</Text>,
};

// A Plugin's card that has its card but nothing in it yet, drawn with the kit's EmptyState.
export const deploysEmptyCard: SessionPluginCard = {
  pluginId: 'deploys',
  card: {
    id: 'deploys',
    title: 'Deploys',
    icon: { sf: 'shippingbox', material: 'deployed_code' },
    page: '/deploys/session',
  },
  page: (
    <EmptyState
      title="No deploys yet"
      description="This Session has not deployed its branch."
    />
  ),
};
