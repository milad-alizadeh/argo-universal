import { IconButton } from '@repo/kit/primitives/actions/icon-button';
import type * as React from 'react';
import type { DraftBarState } from '../../hooks/use-draft-bar';
import { DraftBar } from './draft-bar';
import { DraftBarDock } from './draft-bar-dock';
import { DraftChooseButton } from './draft-choose-button';

export function PluginDraftBar({
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
