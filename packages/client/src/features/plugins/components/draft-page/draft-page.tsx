import type { WireNode } from '@repo/contracts/plugins/wire';
import type * as React from 'react';
import type { PluginTreeProps } from '../../../../lib/product/plugin-registry';
import { usePluginDraft } from '../../hooks/use-plugin-draft';
import type { DraftBarState } from '../../hooks/use-plugin-draft';
import type { PageOpening } from '../../utils/page-addresses';
import { DraftBar } from '../draft-bar/draft-bar';
import { DraftBarDock } from '../draft-bar/draft-bar-dock';
import { DraftChooseButton } from '../draft-bar/draft-choose-button';
import { DraftChooseFeedbackCard } from '../draft-bar/draft-choose-feedback';
import { DraftCommentToggle } from '../draft-comment/draft-comment-toggle';
import { DraftCommentsLayer } from '../draft-comment/draft-comments-layer';
import { DraftRegionsProvider } from '../draft-region/draft-regions';

// What a page hands its drawing while it is a Draft: the tree's draft prop, and a frame to draw in place of its tree.
type DraftDrawing = {
  tree: PluginTreeProps['draft'];
  frame: WireNode | null;
};

function DraftBarOfPage({
  bar,
}: {
  bar: DraftBarState | null;
}): React.ReactNode {
  if (!bar) return null;

  return (
    <DraftBarDock>
      {bar.feedback && (
        <DraftChooseFeedbackCard
          feedback={bar.feedback}
          onDismiss={bar.onDismissFeedback}
        />
      )}
      <DraftBar
        {...bar}
        commentToggle={
          <DraftCommentToggle
            selected={bar.commenting}
            onPress={bar.onToggleComments}
          />
        }
        choose={
          bar.onChoose && (
            <DraftChooseButton
              comments={bar.commentCount}
              disabled={bar.choosing}
              onPress={bar.onChoose}
            />
          )
        }
      />
    </DraftBarDock>
  );
}

/*
 * A page's Draft: wraps the page's drawing in region tags, comment mode and the Draft bar, and hands the drawing
 * what it needs, none of it for a page that is no dev Plugin's Draft (ADR-0057). `error` is why the page's latest
 * draw failed.
 */
export function DraftPage({
  opening,
  error,
  children,
}: {
  opening: PageOpening;
  error: string | null;
  children: (drawing: DraftDrawing) => React.ReactNode;
}): React.JSX.Element {
  const { bar, regions, tree, frame } = usePluginDraft(opening, error);

  const declined =
    bar?.feedback?.kind === 'refused' || bar?.feedback?.kind === 'no-session';

  return (
    <>
      <DraftRegionsProvider regions={regions} commenting={bar?.commenting}>
        <DraftCommentsLayer
          opening={opening}
          draft={bar !== null}
          commenting={bar?.commenting ?? false}
          showSavedPins={declined}
        >
          {children({ tree, frame })}
        </DraftCommentsLayer>
      </DraftRegionsProvider>
      <DraftBarOfPage bar={bar} />
    </>
  );
}
