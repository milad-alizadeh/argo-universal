import type * as React from 'react';
import { View } from 'react-native';
import { fn } from 'storybook/test';
import { PluginTree } from '../../../../lib/product/plugin-registry/plugin-registry';
import { draftComments, type DraftNote } from '../../stores/draft-comments';
import { DraftRegionsProvider } from '../draft-region/draft-regions';
import { issuesPage, issuesTree, regionTags } from './draft-comment-fixtures';
import { DraftCommentsLayer } from './draft-comments-layer';

// Starts each story from the notes it names; the store outlives a story.
function seeded(notes: DraftNote[]): true {
  draftComments.sent(issuesPage);
  draftComments.setCommenting(issuesPage, true);

  for (const note of notes) draftComments.save(issuesPage, note);

  return true;
}

// An Issues page as a dev Plugin's Draft draws it, for the author commenting on it.
export function CommentingPage(props: {
  commenting: boolean;
  notes?: DraftNote[];
  longPressMilliseconds?: number;
}): React.JSX.Element {
  const { commenting, notes = [], longPressMilliseconds } = props;

  const [ready] = [seeded(notes)];

  return (
    <View className="h-96 w-full bg-content p-4">
      <DraftRegionsProvider
        regions={ready ? { tags: regionTags, onStep: fn() } : null}
        commenting={commenting}
      >
        <DraftCommentsLayer
          opening={issuesPage}
          draft
          commenting={commenting}
          longPressMilliseconds={longPressMilliseconds}
        >
          <PluginTree root={issuesTree} />
        </DraftCommentsLayer>
      </DraftRegionsProvider>
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
