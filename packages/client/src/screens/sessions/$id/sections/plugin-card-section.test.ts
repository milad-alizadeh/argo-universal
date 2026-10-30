import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { SessionInspectorContent } from '../session-inspector-content';
import {
  pluginCardKey,
  pluginCardSection,
  type SessionPluginCard,
} from './plugin-card-section';

const issueTracker = 'issue-tracker';

const issueKey = 'plugin:issue-tracker/issue';

const issueCard: SessionPluginCard = {
  pluginId: issueTracker,
  card: {
    id: 'issue',
    title: 'Issue',
    icon: { material: 'confirmation_number' },
    page: '/issues/session',
    tab: '/issues/session/full',
  },
  page: '#412 · In review',
  tab: 'Every comment on #412',
};

// A card the Plugin gave no full view.
const coverageCard: SessionPluginCard = {
  pluginId: 'coverage',
  card: {
    id: 'coverage',
    title: 'Coverage',
    icon: { material: 'percent' },
    page: '/coverage/session',
  },
  page: '78% covered',
};

const ignore = (): void => {};

const changes: SessionInspectorContent = {
  header: {
    title: 'Fix login',
    status: 'idle',
    startedAt: null,
    pullRequests: [],
    changes: {
      summary: { files: 3, additions: 0, deletions: 0 },
      open: false,
      onOpenChange: ignore,
    },
  },
};

// What a phone's Workbench sheet draws for a card.
const sheetBody = (card: SessionPluginCard): ReactNode =>
  pluginCardSection(card).phone?.(changes, { open: ignore, request: ignore })
    .body;

describe("a Plugin's Workbench card", () => {
  it('keys its Section by the Plugin and the card', () => {
    expect(pluginCardKey(issueTracker, 'issue')).toBe(issueKey);
    expect(pluginCardKey(issueTracker, 'issue')).not.toBe(
      pluginCardKey('coverage', 'issue'),
    );
  });

  it('names its Section after the card and draws the Plugin’s page in it', () => {
    const section = pluginCardSection(issueCard);

    expect(section.title).toBe('Issue');
    expect(section.offered({})).toBe(true);
    expect(section.count(changes)).toBe(1);
  });

  it('opens its Inspector tab when it has a full view, and nothing when it has none', () => {
    const select = vi.fn<(key: string) => void>();

    const open = (card: SessionPluginCard): (() => void) | undefined =>
      pluginCardSection(card).card(changes, {
        open: () => select(pluginCardKey(card.pluginId, card.card.id)),
        request: ignore,
      }).onOpen;

    open(issueCard)?.();

    expect(select).toHaveBeenCalledWith(issueKey);
    expect(open(coverageCard)).toBeUndefined();
  });

  it('draws the full view on a phone’s sheet, and the card itself without one', () => {
    expect(sheetBody(issueCard)).toBe(issueCard.tab);
    expect(sheetBody(coverageCard)).toBe(coverageCard.page);
  });
});
