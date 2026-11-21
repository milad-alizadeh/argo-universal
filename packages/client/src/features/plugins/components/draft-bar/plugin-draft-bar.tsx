import { Button } from '@repo/kit/primitives/actions/button';
import { IconButton } from '@repo/kit/primitives/actions/icon-button';
import type * as React from 'react';
import type { DraftBarState } from '../../hooks/use-draft-bar';
import { DraftBar } from './draft-bar';
import { DraftBarDock } from './draft-bar-dock';

// A dev Plugin's Draft page gets the Draft bar over it; any other page draws none (ADR-0057). Choose sends this App's pick and comments, so a page with no regions and no comment has none.
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
            label="Comments"
            control
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

// Choose names how many comments it carries, as the design shows.
function chooseLabel(comments: number): string {
  if (comments === 0) return 'Choose';

  return `Choose · ${comments} ${comments === 1 ? 'comment' : 'comments'}`;
}
