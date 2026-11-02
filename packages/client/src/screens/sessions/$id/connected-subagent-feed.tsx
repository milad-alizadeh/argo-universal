import { useCallback, type ReactElement } from 'react';
import { useBlobUrl } from '#features/connection';
import { toSubagentFeedView, useSessionFeed } from '#features/feed';
import { SubagentFeed, type SubagentFeedProps } from '#features/sessions';
import { useSubagentReports } from './use-subagent-reports';

export type ConnectedSubagentFeedProps = Pick<
  SubagentFeedProps,
  'subagent' | 'onBack'
>;

// A child transcript uses the same paging and live subscription as the parent, with read-only presentation.
function ConnectedSubagentFeed(
  props: ConnectedSubagentFeedProps,
): ReactElement {
  const source = useChildSource(props.subagent);

  const reports = useSubagentReports(
    props.subagent.parentSessionId,
    props.subagent.sessionId,
  );

  const imageUrl = useBlobUrl();

  return drawSubagent(props, { source, reports, imageUrl });
}

interface SubagentSources {
  source: Source;
  reports: ReturnType<typeof useSubagentReports>;
  imageUrl: SubagentFeedProps['feed']['imageUrl'];
}

function drawSubagent(
  props: ConnectedSubagentFeedProps,
  { source, reports, imageUrl }: SubagentSources,
): ReactElement {
  return (
    <SubagentFeed
      {...props}
      feed={childFeed(source, reports.items, imageUrl)}
      {...reportControls(reports)}
    />
  );
}

function useChildSource(
  subagent: ConnectedSubagentFeedProps['subagent'],
): Source {
  const translate = useCallback(
    (
      rows: Parameters<typeof toSubagentFeedView>[0],
      snapshot: Parameters<typeof toSubagentFeedView>[1],
    ) => toSubagentFeedView(rows, snapshot, subagent.parentSessionId),
    [subagent.parentSessionId],
  );

  return useSessionFeed(subagent.sessionId, translate);
}

function reportControls(
  reports: ReturnType<typeof useSubagentReports>,
): Pick<
  SubagentFeedProps,
  'loadEarlierReports' | 'reportsLoading' | 'retryReports'
> {
  return {
    loadEarlierReports: reports.hasOlder ? reports.loadOlder : undefined,
    reportsLoading: reports.loading,
    retryReports: reports.error ? reports.retry : undefined,
  };
}

type Source = ReturnType<typeof useSessionFeed>;

const childItems = (source: Source): SubagentFeedProps['feed']['items'] =>
  source.view?.items ?? [];

const childHeader = (source: Source): SubagentFeedProps['feed']['liveHeader'] =>
  source.snapshot?.liveHeader ?? null;

function childFeed(
  source: Source,
  reports: SubagentFeedProps['feed']['items'],
  imageUrl: SubagentFeedProps['feed']['imageUrl'],
): SubagentFeedProps['feed'] {
  return {
    items: [...childItems(source), ...reports],
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
