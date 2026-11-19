import { formatCallTime } from '@repo/kit/format-elapsed';
import { Icon } from '@repo/kit/primitives/content/icon';
import { Text } from '@repo/kit/primitives/content/text';
import { useClock } from '@repo/kit/use-clock';
import type * as React from 'react';
import { createContext, useContext } from 'react';
import { View } from 'react-native';

// The Voice call attached to a Session, as its row marks it.
export interface SessionRowCall {
  sessionId: string;
  // When the call connected; null while it connects.
  startedAt: string | null;
  // Whether this App's microphone is muted on the call.
  muted: boolean;
  // Fixes the timer's clock, for stories and tests.
  now?: number;
}

const SessionRowCallContext = createContext<SessionRowCall | null>(null);

// Gives the Sessions list the one live Voice call, so the row it is attached to marks it.
export const SessionRowCallProvider = SessionRowCallContext.Provider;

// The live call when it is attached to this Session; none otherwise.
export function useSessionRowCall(
  sessionId: string,
): SessionRowCall | undefined {
  const call = useContext(SessionRowCallContext);

  return call?.sessionId === sessionId ? call : undefined;
}

const callWords = (call: SessionRowCall): string =>
  call.muted ? 'on a Voice call, mic muted' : 'on a Voice call';

// The row's label, ending on the call while one is attached.
export const withCallLabel = (
  label: string,
  call: SessionRowCall | undefined,
): string => (call ? `${label}, ${callWords(call)}` : label);

function LiveCall({ startedAt, now }: SessionRowCall): React.JSX.Element {
  const clock = useClock(true, now);

  return (
    <>
      <Icon name="voice-bars" size="sm" />
      <Text role="row-detail" tone="muted">
        {formatCallTime(startedAt, clock)}
      </Text>
    </>
  );
}

const MutedCall = (): React.JSX.Element => (
  <>
    <Icon name="voice-off" size="sm" tone="danger" />
    <Text role="row-detail" tone="danger">
      Muted
    </Text>
  </>
);

/*
 * Paper's "Sessions list · Quieter call badge — F selected": a bare glyph and the call's time where the row's status
 * was, in ink so it never shares a colour with an Agent's status; "Muted" and mic.slash in red while the mic is off.
 * Only this mark ticks, so the list does not redraw each second.
 */
export function SessionRowCallMark(call: SessionRowCall): React.JSX.Element {
  return (
    <View testID="session-call" className="flex-row items-center gap-1">
      {call.muted ? <MutedCall /> : <LiveCall {...call} />}
    </View>
  );
}

// The call's mark while one is attached, in place of the row's status.
export const callOrStatus = (
  call: SessionRowCall | undefined,
  status: React.ReactNode,
): React.ReactNode => (call ? <SessionRowCallMark {...call} /> : status);
