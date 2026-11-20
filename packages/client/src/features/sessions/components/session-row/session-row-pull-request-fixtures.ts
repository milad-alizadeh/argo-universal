import {
  idleSession,
  issueItem,
  runningSession,
  type SessionRowFixture,
} from './session-row-fixtures';
import type { SessionRowPluginItem } from './session-row-props';

const github = { pluginId: 'github', pluginName: 'GitHub' };

// The GitHub Plugin's glyph, which an item draws only until Argo has the pull request's stage.
const pull = { sf: 'arrow.triangle.pull', material: 'merge_type' } as const;

const pullItem = (
  key: number,
  change: NonNullable<SessionRowPluginItem['item']['change']>,
): SessionRowPluginItem => ({
  ...github,
  key: `github:${key}`,
  item: { icon: pull, text: `#${2100 + key}`, change },
});

// Pull requests as the GitHub Plugin sends them: Argo draws each one's Change stage mark, not the Plugin's glyph.
export const pullRequestItemsSession = {
  ...idleSession,
  plugins: {
    items: [
      pullItem(6, { stage: 'open' }),
      pullItem(9, { stage: 'merged' }),
      pullItem(7, { stage: 'open', draft: true }),
    ],
    more: [],
  },
} satisfies SessionRowFixture;

/*
 * A sidebar row whose counts, pull request and Issue overflow its meta line: Argo's items that fit show whole and the
 * rest join "+N", so no count's running dot is cut at the edge.
 */
export const crowdedMetaSession = {
  ...runningSession,
  session: {
    ...runningSession.session,
    title: 'Voice calls spec #2405',
    activity: 'Working',
    shells: { running: 1, total: 1 },
    subagents: { running: 4, total: 4 },
  },
  pullRequest: undefined,
  age: 'now',
  plugins: {
    items: [pullItem(325, { stage: 'open' }), issueItem],
    more: [],
  },
} satisfies SessionRowFixture;
