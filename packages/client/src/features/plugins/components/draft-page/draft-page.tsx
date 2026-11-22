import type { WireNode } from '@repo/contracts/plugins/wire';
import { IconButton } from '@repo/kit/primitives/actions/icon-button';
import type * as React from 'react';
import type { PluginTreeProps } from '../../../../lib/product/plugin-registry';
import { usePluginDraft } from '../../hooks/use-plugin-draft';
import type { DraftBarState } from '../../hooks/use-plugin-draft';
import type { PageOpening } from '../../utils/page-addresses';
import { DraftBar } from '../draft-bar/draft-bar';
import { DraftBarDock } from '../draft-bar/draft-bar-dock';
import { DraftChooseButton } from '../draft-bar/draft-choose-button';
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
      <DraftBar
        {...bar}
        commentToggle={
          <IconButton
            icon="message"
            accessibilityLabel="Comments"
            size="md"
            variant="secondary"
            selected={bar.commenting}
            aria-pressed={bar.commenting}
            onPress={bar.onToggleComments}
          />
        }
        choose={
          bar.onChoose && (
            <DraftChooseButton
              comments={bar.commentCount}
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

  return (
    <>
      <DraftRegionsProvider regions={regions} commenting={bar?.commenting}>
        <DraftCommentsLayer
          opening={opening}
          draft={bar !== null}
          commenting={bar?.commenting ?? false}
        >
          {children({ tree, frame })}
        </DraftCommentsLayer>
      </DraftRegionsProvider>
      <DraftBarOfPage bar={bar} />
    </>
  );
}
