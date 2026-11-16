import { createContext, type ComponentType } from 'react';

export interface SessionRowDrawingProps {
  sessionId: string;
  // Runs in place of opening the Session.
  onPress?: () => void;
}

/*
 * What draws a Session's row for a kit SessionRow. The App sets it around a Plugin's tree with its connected row, which
 * reads the live Session; the kit holds no Session data, so with none set a SessionRow draws nothing.
 */
export const SessionRowDrawingContext =
  createContext<ComponentType<SessionRowDrawingProps> | null>(null);
