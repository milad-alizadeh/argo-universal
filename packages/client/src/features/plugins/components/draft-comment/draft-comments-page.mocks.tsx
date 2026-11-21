import type { WireNode } from '@repo/contracts/plugins/wire';
import { useState } from 'react';
import type * as React from 'react';
import { Pressable, Text, View } from 'react-native';
import { fn } from 'storybook/test';
import type { OnPageCall } from '../../../../lib/product/plugin-registry/plugin-registry';
import { PluginTree } from '../../../../lib/product/plugin-registry/plugin-registry';
import { draftComments, type DraftNote } from '../../stores/draft-comments';
import { DraftRegionsProvider } from '../draft-region/draft-regions';
import { issuesPage, issuesTree, regionTags } from './draft-comment-fixtures';
import { DraftCommentsLayer } from './draft-comments-layer';

// Starts each story from the notes it names, once; the store outlives a story.
function useSeeded(notes: DraftNote[], commenting: boolean): void {
  useState(() => {
    draftComments.sent(issuesPage);
    draftComments.setCommenting(issuesPage, commenting);

    for (const note of notes) draftComments.save(issuesPage, note);

    return true;
  });
}

type PageProps = {
  commenting: boolean;
  notes?: DraftNote[];
  longPressMilliseconds?: number;
  // What the tree does with a press on a node that has one.
  onPageCall?: OnPageCall;
  root?: WireNode;
  // Whether the page declares the Issues regions; a page with none draws just its tree.
  regions?: boolean;
};

// An Issues page as a dev Plugin's Draft draws it, for the author commenting on it.
export function CommentingPage(props: PageProps): React.JSX.Element {
  const {
    commenting,
    notes = [],
    longPressMilliseconds,
    onPageCall,
    root = issuesTree,
    regions = true,
  } = props;

  useSeeded(notes, commenting);

  return (
    <View className="h-96 w-full bg-content p-4">
      <DraftRegionsProvider
        regions={regions ? { tags: regionTags, onStep: fn() } : null}
        commenting={commenting}
      >
        <DraftCommentsLayer
          opening={issuesPage}
          draft
          commenting={commenting}
          longPressMilliseconds={longPressMilliseconds}
        >
          <PluginTree root={root} onPageCall={onPageCall} />
        </DraftCommentsLayer>
      </DraftRegionsProvider>
    </View>
  );
}

// The same page with a switch for comment mode, as the Draft bar's toggle is.
export function TogglingPage(
  props: Omit<PageProps, 'commenting'>,
): React.JSX.Element {
  const [commenting, setCommenting] = useState(false);

  return (
    <View>
      <Pressable
        accessibilityRole="button"
        onPress={() => setCommenting((on) => !on)}
      >
        <Text>{commenting ? 'Stop commenting' : 'Comment mode'}</Text>
      </Pressable>
      <CommentingPage {...props} commenting={commenting} />
    </View>
  );
}

// Presses a node the way a phone's long press does: the button held down, then let go.
export async function holdOn(
  element: HTMLElement,
  milliseconds: number,
): Promise<void> {
  const { left, top } = element.getBoundingClientRect();
  const at = { bubbles: true, clientX: left + 4, clientY: top + 4 };

  element.dispatchEvent(new MouseEvent('mousedown', at));
  await new Promise((done) => setTimeout(done, milliseconds));
  element.dispatchEvent(new MouseEvent('mouseup', at));
}
