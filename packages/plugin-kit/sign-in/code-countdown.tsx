import {
  ProgressBar,
  Spacer,
  Stack,
  Text,
  useEffect,
  useState,
} from '@argo/plugin-kit';
import type { JSX } from '@argo/plugin-kit/jsx-runtime';
import type { CodeStep } from './steps';

const aSecond = 1000;

const secondsInAMinute = 60;

// What is left of the code, redrawn each second while the page holds it, and never past its end.
function useRemaining(expiresAt: number): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const tick = setTimeout(() => setNow(Date.now()), aSecond);

    return (): void => clearTimeout(tick);
  }, [now]);

  return Math.max(0, expiresAt - now);
}

const twoDigits = (value: number): string => `${value}`.padStart(2, '0');

// Minutes and seconds, as a clock reads them: the part second still counts, so a code with a moment left says 0:01.
function clock(remaining: number): string {
  const total = Math.ceil(remaining / aSecond);

  return `${Math.floor(total / secondsInAMinute)}:${twoDigits(total % secondsInAMinute)}`;
}

const CountdownLine = ({ left }: { left: number }): JSX.Element => (
  <Stack direction="row" gap={4} align="center">
    <Text role="badge" dimmed>
      Waiting for you to approve it…
    </Text>
    <Spacer />
    <Text role="badge" tone="muted">
      {clock(left)}
    </Text>
  </Stack>
);

type Props = Pick<CodeStep, 'expiresAt' | 'lifetimeMs'>;

export function CodeCountdown({ expiresAt, lifetimeMs }: Props): JSX.Element {
  const left = useRemaining(expiresAt);

  return (
    <Stack direction="column" gap={2}>
      <ProgressBar
        value={left / lifetimeMs}
        tone="neutral"
        accessibilityLabel="Time left on this code"
      />
      <CountdownLine left={left} />
    </Stack>
  );
}
