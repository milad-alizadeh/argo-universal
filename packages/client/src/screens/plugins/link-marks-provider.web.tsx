import {
  LinkPreviewContext,
  type LinkPreviewSource,
} from '@repo/kit/primitives/overlays/link-preview';
import { useContext, useMemo, type ReactNode } from 'react';
import type { LinkMarksProviderProps } from './link-marks-provider';
import { useLinkMarks } from './use-link-marks';
import { useTrackedLinks } from './use-tracked-links';

/*
 * The marks beside a Session's links to pull requests and Issues (ADR-0052): the Plugins' answers to the link mark
 * Slot, live while the Session is open, so a link says what the Session row and the Workbench say.
 */
export function LinkMarksProvider({
  projectId,
  children,
}: LinkMarksProviderProps): ReactNode {
  const outer = useContext(LinkPreviewContext);
  const { hrefs, track } = useTrackedLinks();
  const marks = useLinkMarks(projectId, hrefs);

  const source = useMemo(
    (): LinkPreviewSource | null =>
      outer && { ...outer, marks: { of: marks, track } },
    [outer, marks, track],
  );

  return <LinkPreviewContext value={source}>{children}</LinkPreviewContext>;
}
