import { Button } from '@repo/kit/primitives/actions/button';
import { SizeClass } from '@repo/kit/size-class/size-class';
import type * as React from 'react';
import { View } from 'react-native';
import { Feed } from '#features/feed';
import { SubagentFeedHeader } from './subagent-feed-header';
import type { SubagentFeedProps } from './subagent-feed-props';

export type { SubagentFeedProps } from './subagent-feed-props';

/*
 * One Subagent's Feed, read-only. In the Inspector it carries its own header, with Back to the
 * Subagents list; in the phone Sheet the pushed page's header draws the title and Back instead. With no
 * Composer below it, its rows start at the top and it opens on the first, the task message.
 */
export function SubagentFeed(props: SubagentFeedProps): React.JSX.Element {
  return (
    <View className="min-h-0 flex-1">
      <SizeClass only="wide">
        <SubagentFeedHeader {...props} />
      </SizeClass>
      <ReportControls {...props} />
      <Feed {...props.feed} opensAtStart />
    </View>
  );
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
