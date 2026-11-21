import { WireNode } from '@repo/contracts/plugins/wire';
import { Platform } from 'react-native';
import { loadingTree } from '#features/plugins';
import homeC2 from './home-c2-fixture.json';
import paceTrees from './plugin-detail-view-development-pace.json' with { type: 'json' };
import homeTrees from './plugin-detail-view-home.json' with { type: 'json' };
import trees from './plugin-detail-view-issue-filters.json' with { type: 'json' };
import pagedJiraBoard from './plugin-detail-view-jira-board-paged.json' with { type: 'json' };
import jiraBoards from './plugin-detail-view-jira-board.json' with { type: 'json' };
import jiraTrees from './plugin-detail-view-jira-issue.json' with { type: 'json' };
import jiraLists from './plugin-detail-view-jira-list.json' with { type: 'json' };

// Recorded from the Issues Loader through its public page boundary, for each platform drawing.
const drawing =
  Platform.OS === 'ios' || Platform.OS === 'android' ? 'native' : 'desktop';

export const issueFilters = { root: WireNode.parse(trees.loaded[drawing]) };

export const issueFiltersUnavailable = {
  root: WireNode.parse(trees.unavailable[drawing]),
};

// Recorded from the Jira Plugin's issue page through its public page boundary: the issue, a status move Jira has not answered yet, and an issue Jira cannot find. Every platform draws the same tree.
export const jiraIssue = { root: WireNode.parse(jiraTrees.issue) };

export const jiraIssueMoving = { root: WireNode.parse(jiraTrees.pending) };

export const jiraIssueUnreadable = {
  root: WireNode.parse(jiraTrees.unreadable),
};

// Recorded from the Jira Plugin's project page as a list: its issues, as a person first sees them. Every platform draws the same tree.
export const jiraList = { root: WireNode.parse(jiraLists.list) };

// Recorded from the Jira Plugin's project page as a board: its issues, a card moving before Jira answers, and a project with no issues yet, whose statuses still draw as columns. Every platform draws the same tree.
export const jiraBoard = { root: WireNode.parse(jiraBoards.board) };

export const jiraBoardPaged = { root: WireNode.parse(pagedJiraBoard) };

export const jiraBoardMoving = { root: WireNode.parse(jiraBoards.pending) };

export const jiraBoardEmpty = { root: WireNode.parse(jiraBoards.empty) };

export const loading = { root: null };

// The Jira list loading again on a Device that drew it before: its first rows, as they were, under the Skeleton.
export const loadingJiraList = {
  root: null,
  loadingTree: loadingTree(jiraList.root),
};

// Recorded at the GitHub Plugin page boundary with the repository's November 18 development data.
export const developmentPace = { root: WireNode.parse(paceTrees.loaded) };

export const paceRepositories = { root: WireNode.parse(paceTrees.picker) };

export const paceUnavailable = { root: WireNode.parse(paceTrees.unavailable) };

// Recorded from the Home Plugin's page through its public page boundary: the household's lights, the Bridge still to connect, Hue unreachable, and signed out. Every platform draws the same tree.
export const homeLights = { root: WireNode.parse(homeTrees.lights) };

export const homeConnect = { root: WireNode.parse(homeTrees.connect) };

export const homeUnreachable = { root: WireNode.parse(homeTrees.failed) };

export const homeSignedOut = { root: WireNode.parse(homeTrees.signedOut) };

export const homeFaders = { root: WireNode.parse(homeC2.tiles) };

export const homeLightEditor = { root: WireNode.parse(homeC2.light) };

export const homeScenesEditor = { root: WireNode.parse(homeC2.scenes) };

// These states share the same page and replace only its open editor.
type HomeEditorFixture = typeof homeScenesEditor;

function homeEditorFixture(editor: WireNode): HomeEditorFixture {
  const root = WireNode.parse(homeC2.scenes);
  const layout = root.children[0];

  if (!layout) throw new Error('Home editor fixture has no layout');

  return {
    root: {
      ...root,
      children: [
        {
          ...layout,
          children: layout.children.map((node) =>
            node.type === 'Inspector' ? editor : node,
          ),
        },
      ],
    },
  };
}

export const homeManyScenes = homeEditorFixture(WireNode.parse(homeC2.many));

export const homeFilteredScenes = homeEditorFixture(
  WireNode.parse(homeC2.searched),
);

export const homeNoMatchingScenes = homeEditorFixture(
  WireNode.parse(homeC2.noMatch),
);

export const homeNoScenes = homeEditorFixture(WireNode.parse(homeC2.empty));

export const homeOffLight = { root: WireNode.parse(homeC2.off) };
