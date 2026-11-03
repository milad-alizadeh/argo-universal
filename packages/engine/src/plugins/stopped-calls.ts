type Stopped = { ok: false; error: string };

type Waiting = { settle: (stopped: Stopped) => void };

// Fails each waiting call to a Plugin worker that `matches` picks, once its Plugin has stopped.
export function stopWaiting<Call extends Waiting>(
  waiting: Iterable<Call>,
  matches: (call: Call) => boolean,
): void {
  for (const call of waiting)
    if (matches(call)) call.settle({ ok: false, error: 'Plugin stopped' });
}
