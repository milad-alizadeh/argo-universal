import { useCallback, type ReactElement } from 'react';
import { useBlobUrl } from '#features/connection';
import {
  toSubagentFeedView,
  useSessionFeed,
  withParentResults,
} from '#features/feed';
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
  imageUrl: ChildFeed['imageUrl'];
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
    ) => ({
      view: toSubagentFeedView(rows, snapshot, subagent.parentSessionId),
    }),
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

type ChildFeed = NonNullable<SubagentFeedProps['feed']>;

type LoadedSource = Source & {
  view: NonNullable<Source['view']>;
  snapshot: NonNullable<Source['snapshot']>;
};

// Until the child's first page and snapshot arrive, there are no rows to draw yet, not an empty Feed.
const loaded = (source: Source): source is LoadedSource =>
  source.ready && source.view !== null && source.snapshot !== null;

function childPaging(
  source: Source,
): Pick<
  ChildFeed,
  'loadingOlder' | 'hasOlder' | 'historyCursor' | 'onStartReached'
> {
  return {
    loadingOlder: source.loadingOlder,
    hasOlder: source.hasOlder,
    historyCursor: source.historyCursor,
    onStartReached: () => void source.loadOlder(),
  };
}

function childFeed(
  source: Source,
  reports: ReturnType<typeof useSubagentReports>['items'],
  imageUrl: ChildFeed['imageUrl'],
): SubagentFeedProps['feed'] {
  if (!loaded(source)) return undefined;

  return {
    items: withParentResults(source.view.items, reports),
    liveHeader: source.snapshot.liveHeader,
    liveToolCall: source.liveToolCall,
    ...childPaging(source),
    imageUrl,
  };
}

export const renderSubagentFeed = (
  props: ConnectedSubagentFeedProps,
): ReactElement => (
  <ConnectedSubagentFeed key={props.subagent.sessionId} {...props} />
);
