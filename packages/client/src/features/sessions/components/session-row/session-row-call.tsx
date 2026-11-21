import { formatCallTime } from '@repo/kit/format-elapsed';
import { Icon } from '@repo/kit/primitives/content/icon';
import { Text } from '@repo/kit/primitives/content/text';
import { useClock } from '@repo/kit/use-clock';
import type * as React from 'react';
import { createContext, useContext } from 'react';
import { View } from 'react-native';

// The Conversation attached to a Session, as its row marks it.
export interface SessionRowCall {
  sessionId: string;
  // When the call connected; null while it connects.
  startedAt: string | null;
  muted: boolean;
  indicator?: React.ReactNode;
  // Fixes the timer's clock, for stories and tests.
  now?: number;
}

// A row's props with the call attached to its Session, if any.
export type CalledRowProps = { call?: SessionRowCall };

const SessionRowCallContext = createContext<SessionRowCall | null>(null);

// Gives the Sessions list the one live Conversation, so the row it is attached to marks it.
export const SessionRowCallProvider = SessionRowCallContext.Provider;

// The live call when it is attached to this Session; none otherwise.
export function useSessionRowCall(
  sessionId: string,
): SessionRowCall | undefined {
  const call = useContext(SessionRowCallContext);

  return call?.sessionId === sessionId ? call : undefined;
}

const callWords = (call: SessionRowCall): string =>
  call.muted ? 'in a Conversation, mic muted' : 'in a Conversation';

// The row's label, ending on the call while one is attached.
export const withCallLabel = (
  label: string,
  call: SessionRowCall | undefined,
): string => (call ? `${label}, ${callWords(call)}` : label);

// The call's running time; none while it connects, so the row never shows a clock stuck at 0:00.
function CallTime({ startedAt, now }: SessionRowCall): React.ReactNode {
  const clock = useClock(startedAt !== null, now);

  return (
    startedAt !== null && (
      <Text role="row-detail" tone="muted">
        {formatCallTime(startedAt, clock)}
      </Text>
    )
  );
}

const LiveCall = (call: SessionRowCall): React.JSX.Element => (
  <>
    {call.indicator}
    <CallTime {...call} />
  </>
);

const MutedCall = (): React.JSX.Element => (
  <>
    <Icon name="voice-off" size="sm" tone="danger" />
    <Text role="row-detail" tone="danger">
      Muted
    </Text>
  </>
);

// Only the call mark animates and ticks, so the list does not redraw on each frame or second.
export function SessionRowCallMark({
  call,
}: {
  call: SessionRowCall;
}): React.JSX.Element {
  return (
    <View testID="session-call" className="flex-row items-center gap-1">
      {call.muted ? <MutedCall /> : <LiveCall {...call} />}
    </View>
  );
}

// The row's status, or the call's mark in its place while a call is attached.
export const statusUnlessCalled = (
  status: React.ReactNode,
  call: SessionRowCall | undefined,
): React.ReactNode => (call ? <SessionRowCallMark call={call} /> : status);
