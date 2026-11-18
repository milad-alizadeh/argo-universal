import { Button } from '@repo/kit/primitives/actions/button';
import { Text } from '@repo/kit/primitives/content/text';
import { SizeClass } from '@repo/kit/size-class/size-class';
import type * as React from 'react';
import { View } from 'react-native';
import { useCSSVariable } from 'uniwind';
import { Feed } from '#features/feed';
import { SessionColumn, WideColumnGutter } from '#lib/product/session-column';
import { subagentMetrics } from '../subagent-list/subagent-format';
import { SubagentFeedHeader } from './subagent-feed-header';
import type { SubagentFeedProps } from './subagent-feed-props';

export type { SubagentFeedProps } from './subagent-feed-props';

/*
 * One Subagent's Feed, read-only. In the Inspector it carries its own header, with Back to the
 * Subagents list; in the phone Sheet the pushed page's header draws the title and Back instead. With no
 * Composer below it, its rows start at the top and it opens on the first, the task message. Until
 * its rows load it stays blank under the header, as an opening Session's page does: it always has a
 * task message, so it never draws the empty Session's heading.
 */
export function SubagentFeed(props: SubagentFeedProps): React.JSX.Element {
  // The Inspector tabs use spacing-3 for their leading inset.
  const gutter = Number.parseFloat(String(useCSSVariable('--spacing-3')));

  return (
    <WideColumnGutter.Provider value={gutter}>
      <View className="agent-feed min-h-0 flex-1">
        <FeedHeading {...props} />
        <ReportControls {...props} />
        {props.feed && <Feed {...props.feed} opensAtStart />}
      </View>
    </WideColumnGutter.Provider>
  );
}

function FeedHeading(props: SubagentFeedProps): React.JSX.Element {
  return (
    <View className="agent-feed-heading shrink-0">
      <SizeClass only="wide">
        <SubagentFeedHeader {...props} />
      </SizeClass>
      <SizeClass only="wide">
        <Metrics subagent={props.subagent} includeModel={false} />
      </SizeClass>
      <SizeClass only="compact">
        <Metrics subagent={props.subagent} />
      </SizeClass>
    </View>
  );
}

function Metrics({
  subagent,
  includeModel = true,
}: Pick<SubagentFeedProps, 'subagent'> & {
  includeModel?: boolean;
}): React.JSX.Element | null {
  const metrics = subagentMetrics(subagent, includeModel);

  return metrics ? (
    <SessionColumn className="pb-2">
      <Text role="secondary" tone="muted">
        {metrics}
      </Text>
    </SessionColumn>
  ) : null;
}

function ReportControls(props: SubagentFeedProps): React.JSX.Element {
  return (
    <>
      <RetryReports retry={props.retryReports} />
      <EarlierReports {...props} />
    </>
  );
}

function RetryReports({
  retry,
}: {
  retry?: () => void;
}): React.JSX.Element | null {
  return retry ? (
    <Button label="Retry loading reports" size="sm" onPress={retry} />
  ) : null;
}

function EarlierReports(props: SubagentFeedProps): React.JSX.Element | null {
  return props.loadEarlierReports ? (
    <Button
      label="Load earlier reports"
      size="sm"
      onPress={props.loadEarlierReports}
      disabled={props.reportsLoading}
    />
  ) : null;
}
