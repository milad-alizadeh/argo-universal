import { describe, expect, it } from 'vitest';
import type { SessionPullRequest } from '#features/sessions';
import { severalPullRequests } from '../../../../features/sessions/components/session-pull-request.mocks';
import { sessionShells } from '../../../../features/sessions/components/shell-list/shell-list.mocks';
import { subagentStates } from '../../../../features/sessions/components/subagent-list/subagent-list.mocks';
import type { SessionInspectorContent } from '../session-inspector-content';
import { agentsFacts } from './agents-facts';
import { changesFacts } from './changes-facts';
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

const busy = {
  header: header(2, severalPullRequests),
  subagents: { subagents: subagentStates.severalMixed },
  shells: { shells: sessionShells, onStop: ignore },
} satisfies SessionInspectorContent;

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

  it('draws a card only for a Section with something to count', () => {
    expect(cards({ header: header(0) })).toEqual([]);
    expect(cards({ header: header(3) })).toEqual(['changes']);
    expect(cards(busy)).toEqual(['changes', 'subagents', 'shells']);
  });
});
