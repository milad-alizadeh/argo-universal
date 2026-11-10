import { RetainedPageVisibility } from '@repo/kit/use-shown-page';
import { useState } from 'react';
import type * as React from 'react';
import { View, type ViewStyle } from 'react-native';

const retainedSessionCount = 3;

function useRecentSessions(sessionId: string): string[] {
  const [recent, setRecent] = useState([sessionId]);

  if (recent[0] !== sessionId)
    setRecent(
      [sessionId, ...recent.filter((id) => id !== sessionId)].slice(
        0,
        retainedSessionCount,
      ),
    );

  return recent;
}

const retainedStyle = {
  position: 'absolute',
  width: '100%',
  height: '100%',
  opacity: 0,
} as const;

const sessionStyle = (visible: boolean): ViewStyle =>
  visible ? { flex: 1 } : retainedStyle;

const sessionPointer = (visible: boolean): 'auto' | 'none' =>
  visible ? 'auto' : 'none';

function retainedProps(visible: boolean): React.ComponentProps<typeof View> {
  return {
    'aria-hidden': !visible,
    className: visible ? undefined : 'web:invisible',
    pointerEvents: sessionPointer(visible),
    style: sessionStyle(visible),
  };
}

function RetainedSession({
  visible,
  children,
}: {
  visible: boolean;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <RetainedPageVisibility value={visible}>
      <View {...retainedProps(visible)}>{children}</View>
    </RetainedPageVisibility>
  );
}

// One order for the same pages, whichever is shown.
const inFixedOrder = (ids: string[]): string[] =>
  [...ids].sort((one, other) => one.localeCompare(other));

export interface RetainedSessionsProps {
  // The Session shown; the others stay mounted behind it.
  sessionId: string;
  // Draws one Session's page.
  children: (sessionId: string) => React.ReactNode;
}

/*
 * The three most recently shown wide Session pages keep their live Feeds. The pages are drawn in one
 * fixed order whichever is shown: a browser drops the scroll position of an element that moves in the
 * document, so a page reordered behind the shown one came back with its Feed scrolled to an empty top.
 */
export function RetainedSessions({
  sessionId,
  children,
}: RetainedSessionsProps): React.JSX.Element {
  const recent = useRecentSessions(sessionId);

  return (
    <View style={{ flex: 1 }}>
      {inFixedOrder(recent).map((id) => (
        <RetainedSession key={id} visible={id === sessionId}>
          {children(id)}
        </RetainedSession>
      ))}
    </View>
  );
}
