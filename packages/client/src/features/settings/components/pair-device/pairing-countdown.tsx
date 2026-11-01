import { pairingTicketLifetimeMs } from '@repo/contracts';
import { Text } from '@repo/kit/primitives/content/text';
import { ProgressBar } from '@repo/kit/primitives/status/progress-bar';
import * as React from 'react';
import { View } from 'react-native';

const aSecond = 1000;

const secondsInAMinute = 60;

const note = 'Works once. A new code appears automatically.';

const barLabel = 'Time left on this code';

export interface PairingCountdownProps {
  // When the Server stops accepting this Ticket, as the mint reported it.
  expiresAt: string;
}

/*
 * How much of the Pairing Ticket's life is left, so the owner can see the code go before it goes (#1502).
 * The share is read against `pairingTicketLifetimeMs`, the same constant the Server mints against, so the
 * bar starts full on a fresh code and the sheet needs no lifetime of its own.
 */
export function PairingCountdown(
  props: PairingCountdownProps,
): React.JSX.Element {
  const left = useRemaining(props.expiresAt);

  return (
    <View className="gap-2">
      <ProgressBar
        value={left / pairingTicketLifetimeMs}
        tone="neutral"
        accessibilityLabel={barLabel}
      />
      <CountdownLine left={left} />
    </View>
  );
}

// What the bar means on one side and how long is left on the other, as a caption under it.
function CountdownLine(props: { left: number }): React.JSX.Element {
  return (
    <View className="flex-row items-center justify-between gap-4">
      <Text role="badge" dimmed>
        {note}
      </Text>
      <Text role="badge" tone="muted">
        {clock(props.left)}
      </Text>
    </View>
  );
}

// What is left of the Ticket, redrawn each second while the sheet holds it, and never past its end.
function useRemaining(expiresAt: string): number {
  const [now, setNow] = React.useState((): number => Date.now());

  React.useEffect((): (() => void) => {
    const tick = setInterval((): void => setNow(Date.now()), aSecond);

    return (): void => clearInterval(tick);
  }, []);

  return Math.max(0, Date.parse(expiresAt) - now);
}

// Minutes and seconds, as a clock reads them: the part second still counts, so a code with a moment left says 0:01.
function clock(remaining: number): string {
  const seconds = Math.ceil(remaining / aSecond);
  const minutes = Math.floor(seconds / secondsInAMinute);
  const rest = `${seconds % secondsInAMinute}`.padStart(2, '0');

  return `${minutes}:${rest}`;
}
