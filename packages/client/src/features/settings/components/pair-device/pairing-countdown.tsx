import { Text } from '@repo/kit/primitives/content/text';
import { ProgressBar } from '@repo/kit/primitives/status/progress-bar';
import * as React from 'react';
import { View } from 'react-native';
import { codeShownForMs, renewsAt } from './pairing-renewal';

const aSecond = 1000;

const secondsInAMinute = 60;

const note = 'Codes work once, for about two minutes.';

const barLabel = 'Time left on this code';

export interface PairingCountdownProps {
  // When the Server stops accepting this Ticket, as the mint reported it; the sheet swaps the code a little before.
  expiresAt: string;
}

/*
 * How long until the sheet swaps this code for a new one, so the owner can see it is about to change (#1502, #2353).
 * It runs to the swap rather than to the Ticket's end, so the bar empties at 0:00 and the next code starts it full again.
 */
export function PairingCountdown(
  props: PairingCountdownProps,
): React.JSX.Element {
  const left = useRemaining(renewsAt(props.expiresAt));

  return (
    <View className="gap-2">
      <ProgressBar
        value={left / codeShownForMs}
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

// What is left until `endsAt`, redrawn each second while the sheet holds the code, and never past it.
function useRemaining(endsAt: number): number {
  const [now, setNow] = React.useState((): number => Date.now());

  React.useEffect((): (() => void) => {
    const tick = setInterval((): void => setNow(Date.now()), aSecond);

    return (): void => clearInterval(tick);
  }, []);

  return Math.max(0, endsAt - now);
}

// Minutes and seconds, as a clock reads them: the part second still counts, so a code with a moment left says 0:01.
function clock(remaining: number): string {
  const seconds = Math.ceil(remaining / aSecond);
  const minutes = Math.floor(seconds / secondsInAMinute);
  const rest = `${seconds % secondsInAMinute}`.padStart(2, '0');

  return `${minutes}:${rest}`;
}
