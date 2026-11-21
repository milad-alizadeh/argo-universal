import type * as React from 'react';
import type { FeedDelegated, FeedSubagent } from '../view/feed-view';
import { SubagentRow } from './subagent-row/subagent-row';

export function DelegatedFeedRow({
  item,
}: {
  item: FeedDelegated;
}): React.JSX.Element {
  const source: FeedSubagent = {
    type: 'subagent',
    id: item.id,
    subagentSessionId: item.sourceSessionId,
    title: item.title,
    kind: item.kind,
    role: null,
  };

  return <SubagentRow item={source} onOpen={item.onOpen} />;
}
