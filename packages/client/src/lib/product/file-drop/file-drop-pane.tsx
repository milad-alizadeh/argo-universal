import { cn } from '@repo/kit/utils';
import type * as React from 'react';
import { type ReactNode, useId } from 'react';
import { View } from 'react-native';
import { composerOverlap } from '../composer-cover';
import { FileDropLabel, FileDropZone } from './file-drop-zone';
import { type DroppedFiles, useFileDrop } from './use-file-drop';

export type { DroppedFiles } from './use-file-drop';

interface FileDropPaneProps {
  feed: ReactNode;
  // A filled Composer hides the Feed, which stays mounted so it keeps its place.
  hideFeed: boolean;
  onDropFiles?: (dropped: DroppedFiles) => void;
  // The Composer, below the Feed and part of the same target.
  children: ReactNode;
}

interface FeedPartProps {
  feed: ReactNode;
  hidden: boolean;
  dragging: boolean;
}

// The Feed recedes behind the label while files are over the window.
function FadingFeed({
  feed,
  dragging,
}: Omit<FeedPartProps, 'hidden'>): React.JSX.Element {
  return (
    <>
      <View className={cn('min-h-0 flex-1', dragging && 'opacity-20')}>
        {feed}
      </View>
      {dragging && <FileDropLabel />}
    </>
  );
}

/*
 * The Composer reaches `composerOverlap` up over the Feed's end, so the Feed keeps that much height: a Composer
 * that has to give height up then stops at the pane's top rather than running on past it (#1606).
 */
const feedKeeps = { minHeight: composerOverlap };

function FeedPart({ hidden, ...feed }: FeedPartProps): React.JSX.Element {
  return (
    <View
      className={cn('relative flex-1', hidden && 'hidden')}
      style={feedKeeps}
    >
      <FadingFeed {...feed} />
    </View>
  );
}

// One drop target for the pane below the Session header, Composer included. While files are over the window it shows where they land; the Composer, where they arrive, stays whole.
export function FileDropPane(props: FileDropPaneProps): React.JSX.Element {
  const paneId = useId();

  const dragging = useFileDrop({
    targetId: paneId,
    onDropFiles: props.onDropFiles,
  });

  return (
    <View nativeID={paneId} className="relative min-h-0 flex-1">
      {dragging && <FileDropZone />}
      <FeedPart feed={props.feed} hidden={props.hideFeed} dragging={dragging} />
      {props.children}
    </View>
  );
}
