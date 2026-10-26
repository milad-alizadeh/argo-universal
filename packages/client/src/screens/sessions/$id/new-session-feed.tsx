import type * as React from 'react';
import { View } from 'react-native';
import { Feed } from '#features/feed';
import { NewSessionQuestion, type StartingFeed } from '#features/sessions';
import { useContentWide } from '#lib/product/content-layout';
import { SessionColumn } from '#lib/product/session-column';

const noOlderRows = (): void => {};

type HeadingProps = { context?: React.ReactNode };

// Wide, the question sits centred in the space a Session's Feed fills.
function NewSessionHeading(props: HeadingProps): React.JSX.Element | null {
  if (!useContentWide()) return null;

  return (
    <View className="flex-1 justify-center">
      <SessionColumn>
        <NewSessionQuestion>{props.context}</NewSessionQuestion>
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
