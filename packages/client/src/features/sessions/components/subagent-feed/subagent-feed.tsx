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
      <Feed {...props.feed} opensAtStart />
    </View>
  );
}
