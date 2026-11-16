import { useContext, type ReactElement } from 'react';
import { SessionRowDrawingContext } from '#kit/session-row-drawing';
import type { SessionRowProps } from './session-row-props';

/*
 * Lists / SessionRow: one of the App's own Sessions as its row in the Sessions list. The App draws it from the live
 * Session, so a Plugin sends only the Session's id; a Session the App cannot find draws nothing.
 */
export function SessionRow({
  sessionId,
  onPress,
}: SessionRowProps): ReactElement | null {
  const Drawing = useContext(SessionRowDrawingContext);

  return Drawing ? <Drawing sessionId={sessionId} onPress={onPress} /> : null;
}
