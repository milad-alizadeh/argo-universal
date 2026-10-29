import type { ReactElement } from 'react';
import { useBlobUrl } from '#features/connection';
import { toSubagentFeedView, useSessionFeed } from '#features/feed';
import { SubagentFeed, type SubagentFeedProps } from '#features/sessions';

export type ConnectedSubagentFeedProps = Pick<
  SubagentFeedProps,
  'subagent' | 'onBack'
>;

// A child transcript uses the same paging and live subscription as the parent, with read-only presentation.
function ConnectedSubagentFeed(
  props: ConnectedSubagentFeedProps,
): ReactElement {
  const source = useSessionFeed(props.subagent.sessionId, toSubagentFeedView);
  const imageUrl = useBlobUrl();

  return <SubagentFeed {...props} feed={childFeed(source, imageUrl)} />;
}

type Source = ReturnType<typeof useSessionFeed>;

const childItems = (source: Source): SubagentFeedProps['feed']['items'] =>
  source.view?.items ?? [];

const childHeader = (source: Source): SubagentFeedProps['feed']['liveHeader'] =>
  source.snapshot?.liveHeader ?? null;

function childFeed(
  source: Source,
  imageUrl: SubagentFeedProps['feed']['imageUrl'],
): SubagentFeedProps['feed'] {
  return {
    items: childItems(source),
    liveHeader: childHeader(source),
    liveToolCall: source.liveToolCall,
    loadingOlder: source.loadingOlder,
    onStartReached: () => void source.loadOlder(),
    imageUrl,
  };
}

export const renderSubagentFeed = (
  props: ConnectedSubagentFeedProps,
): ReactElement => <ConnectedSubagentFeed {...props} />;
