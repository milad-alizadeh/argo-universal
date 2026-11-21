import { Button } from '@repo/kit/primitives/actions/button';
import type * as React from 'react';
import type { DraftBarState } from '../../hooks/use-draft-bar';
import { DraftBar } from './draft-bar';
import { DraftBarDock } from './draft-bar-dock';

// A dev Plugin's Draft page gets the Draft bar over it; any other page draws none (ADR-0057). Choose sends this App's pick, so a page with no regions to pick has none.
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
        choose={
          bar.onChoose && (
            <Button label="Choose" size="sm" onPress={bar.onChoose} />
          )
        }
      />
    </DraftBarDock>
  );
}
