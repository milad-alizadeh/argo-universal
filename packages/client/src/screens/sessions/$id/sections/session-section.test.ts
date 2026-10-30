import type { ChangesSummary } from '@repo/contracts';
import { describe, expect, it } from 'vitest';
import type { ChangesViewProps } from '#features/changes';
import type { SessionPullRequest } from '#features/sessions';
import { severalPullRequests } from '../../../../features/sessions/components/session-pull-request.mocks';
import { sessionShells } from '../../../../features/sessions/components/shell-list/shell-list.mocks';
import { subagentStates } from '../../../../features/sessions/components/subagent-list/subagent-list.mocks';
import type { SessionInspectorContent } from '../session-inspector-content';
import { agentsFacts } from './agents-facts';
import { changesFacts, summaryOf } from './changes-facts';
import { drawsCard, itemsOf, offeredKeys } from './session-section';
import { shellsFacts } from './shells-facts';

const facts = [changesFacts, agentsFacts, shellsFacts];

const ignore = (): void => {};

const header = (
  files: number,
  pullRequests: readonly SessionPullRequest[] = [],
): SessionInspectorContent['header'] => ({
  title: 'Fix login',
  status: 'idle',
  startedAt: null,
  pullRequests: [...pullRequests],
  changes: {
    summary: { files, additions: 0, deletions: 0 },
    open: false,
    onOpenChange: ignore,
  },
});

// The Changes the Inspector has loaded, as `useChanges` hands them to the page.
const loaded = (summary?: ChangesSummary): ChangesViewProps => ({
  comparison: { kind: 'main' },
  branches: { names: [] },
  onComparisonChange: ignore,
  summary,
  diffs: {},
  onLoadDiff: ignore,
  viewed: [],
  onViewedChange: ignore,
});

const busy = {
  header: header(2, severalPullRequests),
  subagents: { subagents: subagentStates.severalMixed },
  shells: { shells: sessionShells, onStop: ignore },
} satisfies SessionInspectorContent;

const noChanges: ChangesSummary = { files: 0, additions: 0, deletions: 0 };

const counts = (content: SessionInspectorContent): number[] =>
  facts.map((section) => section.count(content));

const cards = (content: SessionInspectorContent): string[] =>
  facts.flatMap((section) =>
    drawsCard(section, content) ? [section.key] : [],
  );

describe("a Session's Sections", () => {
  it('always offers Changes, and Agents and Shells only once the Session has some', () => {
    expect(offeredKeys(facts, {})).toEqual(['changes']);
    expect(offeredKeys(facts, itemsOf(busy))).toEqual([
      'changes',
      'subagents',
      'shells',
    ]);
  });

  it('counts changed files or pull requests, whichever is more, and each Agent and Shell', () => {
    expect(counts(busy)).toEqual([
      severalPullRequests.length,
      subagentStates.severalMixed.length,
      sessionShells.length,
    ]);
    expect(counts({ header: header(11, severalPullRequests) })).toEqual([
      11, 0, 0,
    ]);
  });

  it('counts the Changes the Inspector has loaded, not the totals the snapshot carried', () => {
    const content = {
      header: header(2),
      changes: loaded({ files: 7, additions: 90, deletions: 4 }),
    };

    expect(summaryOf(content)).toEqual({
      files: 7,
      additions: 90,
      deletions: 4,
    });
    expect(changesFacts.count(content)).toBe(7);
  });

  it("falls back to the snapshot's totals only until the first read settles", () => {
    const content = { header: header(2), changes: loaded() };

    expect(summaryOf(content)?.files).toBe(2);
    expect(summaryOf({ ...content, changes: loaded(noChanges) })).toEqual(
      noChanges,
    );
  });

  it('draws a card only for a Section with something to count', () => {
    expect(cards({ header: header(0) })).toEqual([]);
    expect(cards({ header: header(3) })).toEqual(['changes']);
    expect(cards(busy)).toEqual(['changes', 'subagents', 'shells']);
  });
});
