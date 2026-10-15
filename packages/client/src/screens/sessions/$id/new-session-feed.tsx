import type * as React from 'react';
import { View } from 'react-native';
import { Feed } from '#features/feed';
import { type StartingFeed } from '#features/sessions';
import { useContentWide } from '#lib/product/content-layout';
import { SessionColumn } from '#lib/product/session-column';
import { Text } from '#primitives/display/text';

const noOlderRows = (): void => {};

// Wide, the question sits centred in the space a Session's Feed fills.
function NewSessionHeading(): React.JSX.Element | null {
  if (!useContentWide()) return null;

  return (
    <View className="flex-1 justify-center pb-10">
      <SessionColumn className="px-4">
        <Text role="title" accessibilityRole="heading" aria-level={1}>
          What should we work on?
        </Text>
      </SessionColumn>
    </View>
  );
}

// The sent prompt and Working while the Session starts, else the question.
interface NewSessionFeedProps {
  starting?: StartingFeed;
}

export function NewSessionFeed({
  starting,
}: NewSessionFeedProps): React.JSX.Element {
  if (!starting) return <NewSessionHeading />;

  return (
    <Feed
      items={starting.items}
      liveHeader={starting.liveHeader}
      imageUrl={starting.imageUrl}
      loadingOlder={false}
      onStartReached={noOlderRows}
    />
  );
}
