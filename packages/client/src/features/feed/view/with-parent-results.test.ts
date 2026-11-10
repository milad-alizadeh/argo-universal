import type { AgentMessage, SubagentUpdate } from '@repo/contracts';
import { expect, it } from 'vitest';
import { subagentSnapshot } from '../../../../mocks/subagent-rows.mocks';
import { feedItemKey, type FeedViewItem, type ParentResult } from './feed-view';
import { toFeedView } from './to-feed-view';
import { toParentResults } from './to-parent-results';
import { withParentResults } from './with-parent-results';

const childId = 'child-session';

const childMessage = (position: number): AgentMessage => ({
  id: `child-${position}`,
  sessionId: childId,
  position,
  revision: position,
  turnId: 'child-turn',
  state: 'settled',
  sessionUpdate: 'agent_message',
  messageId: `message-${position}`,
  content: [{ type: 'text', text: `Step ${position}` }],
});

const report = (id: string, childPosition?: number): SubagentUpdate => {
  const argo: NonNullable<SubagentUpdate['_meta']>['argo'] = {
    result: [{ type: 'text', text: id }],
  };

  if (childPosition !== undefined) argo.childPosition = childPosition;

  return {
    id,
    sessionId: 'parent-session',
    position: 40,
    revision: 40,
    turnId: null,
    state: 'settled',
    sessionUpdate: 'subagent_update',
    subagentSessionId: childId,
    _meta: { argo },
  };
};

const childRows = [0, 1, 2, 3, 4, 5].map(childMessage);

const isParentResult = (item: FeedViewItem): item is ParentResult =>
  item.type === 'parent_result';

const drawnOrder = (reports: SubagentUpdate[]): string[] =>
  withParentResults(
    toFeedView(childRows, subagentSnapshot).items,
    toParentResults(reports, childId).items.filter(isParentResult),
  ).map(feedItemKey);

it('draws a report before the child rows written after it arrived', () => {
  expect(drawnOrder([report('launched', 3)])).toEqual([
    'child-0',
    'child-1',
    'child-2',
    'launched',
    'child-3',
    'child-4',
    'child-5',
  ]);
});

it('draws reports at the same position in parent Feed order', () => {
  expect(drawnOrder([report('first', 0), report('second', 0)])).toEqual([
    'first',
    'second',
    ...childRows.map((row) => row.id),
  ]);
});

it('draws a report after every loaded row when it arrived later', () => {
  expect(drawnOrder([report('finished', 9)])).toEqual([
    ...childRows.map((row) => row.id),
    'finished',
  ]);
});

it('draws a report stored without a child position at the end', () => {
  expect(drawnOrder([report('stored'), report('placed', 1)])).toEqual([
    'child-0',
    'placed',
    'child-1',
    'child-2',
    'child-3',
    'child-4',
    'child-5',
    'stored',
  ]);
});
