import { useContext, type ReactNode } from 'react';
import { SessionRowDrawingContext } from '#kit/session-row-drawing';
import type { SessionRowProps } from './session-row-props';

/*
 * Lists / SessionRow: one of the App's own Sessions as its row in the Sessions list. The App draws it from the live
 * Session, so a Plugin sends only the Session's id; a Session the App cannot find draws nothing.
 */
export function SessionRow({ sessionId, onPress }: SessionRowProps): ReactNode {
  const draw = useContext(SessionRowDrawingContext);

  return draw ? draw({ sessionId, onPress }) : null;
}
