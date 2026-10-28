import type { SessionBarItem } from '@repo/contracts/plugins/session-bar-item';
import { Text } from '@repo/kit/primitives/content/text';
import type * as React from 'react';
import { SessionBar } from '#features/sessions';
import type { SlotVisibility, SplitItems } from '#features/settings';
import { SessionBarStrip } from '#lib/product/session-bar-row';
import { sessionBarLines } from '../../../../plugins/session-bar-lines';
import { usePluginNames } from '../../../../plugins/use-plugin-names';
import { useSessionBarAnswer } from '../../../../plugins/use-session-bar';
import { useLatestSession } from './session-row-preview';
import type { SlotPreviewProps } from './slot-detail';

// What the preview draws: the Plugins' answers for a Session's bar, before this page's choices apply.
export interface SessionBarPreviewData {
  answer: SplitItems<SessionBarItem>;
  pluginName: (pluginId: string) => string;
}

type PreviewProps = { data: SessionBarPreviewData; visibility: SlotVisibility };

export const noBarLine = 'No Plugin left on sends a line for this Session.';

/*
 * The Session page's own bar, under the page's choices: the first Plugin left on shows, and the rest wait behind
 * "+N". With none left on, the page says so, as the Session page draws no bar.
 */
export function SessionBarPreview({
  data,
  visibility,
}: PreviewProps): React.JSX.Element {
  const lines = sessionBarLines(data.answer, visibility, data.pluginName);

  if (!lines) return <Text role="secondary">{noBarLine}</Text>;

  return (
    <SessionBarStrip inset>
      <SessionBar {...lines} onOpen={ignore} />
    </SessionBarStrip>
  );
}

// The preview shows the bar only; Open does nothing here.
const ignore = (): void => undefined;

// The preview on the App: the bar the Server's Plugins send for the latest Session.
export function LiveSessionBarPreview({
  visibility,
}: SlotPreviewProps): React.JSX.Element {
  const latest = useLatestSession();

  const answer = useSessionBarAnswer(
    latest && { sessionId: latest.sessionId, projectId: latest.projectId },
  );

  return (
    <SessionBarPreview
      data={{ answer, pluginName: usePluginNames() }}
      visibility={visibility}
    />
  );
}
