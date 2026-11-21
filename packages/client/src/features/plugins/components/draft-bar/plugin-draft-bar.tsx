import { Button } from '@repo/kit/primitives/actions/button';
import { IconButton } from '@repo/kit/primitives/actions/icon-button';
import type * as React from 'react';
import type { DraftBarState } from '../../hooks/use-draft-bar';
import { DraftBar } from './draft-bar';
import { DraftBarDock } from './draft-bar-dock';

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
            control
            variant="secondary"
            selected={bar.commenting}
            aria-pressed={bar.commenting}
            onPress={bar.onToggleComments}
          />
        }
        choose={
          bar.onChoose && (
            <Button
              label={chooseLabel(bar.commentCount)}
              size="sm"
              onPress={bar.onChoose}
            />
          )
        }
      />
    </DraftBarDock>
  );
}

function chooseLabel(comments: number): string {
  if (comments === 0) return 'Choose';

  return `Choose · ${comments} ${comments === 1 ? 'comment' : 'comments'}`;
}
