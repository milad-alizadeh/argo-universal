import type * as React from 'react';
import { View } from 'react-native';
import { Feed } from '#features/feed';
import { type StartingFeed } from '#features/sessions';
import { useContentWide } from '#lib/product/content-layout';
import { SessionColumn } from '#lib/product/session-column';
import { Text } from '#primitives/content/text';

const noOlderRows = (): void => {};

// Wide, the question sits centred in the space a Session's Feed fills.
function NewSessionHeading({
  context,
}: {
  context?: React.ReactNode;
}): React.JSX.Element | null {
  if (!useContentWide()) return null;

  return (
    <View className="flex-1 justify-center pb-10">
      <SessionColumn className="items-center px-4">
        <NewSessionTitle />
        {context}
      </SessionColumn>
    </View>
  );
}

// The sent prompt and Working while the Session starts, else the question.
interface NewSessionFeedProps {
  starting?: StartingFeed;
  context?: React.ReactNode;
}

export function NewSessionFeed({
  starting,
  context,
}: NewSessionFeedProps): React.JSX.Element {
  if (!starting) return <NewSessionHeading context={context} />;

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

function NewSessionTitle(): React.JSX.Element {
  return (
    <Text role="title" accessibilityRole="heading" aria-level={1}>
      What should we work on?
    </Text>
  );
}
