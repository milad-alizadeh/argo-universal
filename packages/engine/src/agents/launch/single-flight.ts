// One install per folder. Joiners share it; the install aborts only when every joiner has aborted.
type Flight = {
  work: Promise<void>;
  controller: AbortController;
  joined: number;
};

type Operation = (signal: AbortSignal) => Promise<void>;

type Abortion = { aborted: Promise<never>; stop: () => void };

const flights = new Map<string, Flight>();

const settled = (): void => {};

const after = (flight: Flight | undefined): Promise<void> =>
  (flight?.work ?? Promise.resolve()).then(settled, settled);

const forget = (directory: string, flight: Flight): void => {
  if (flights.get(directory) === flight) flights.delete(directory);
};

const start = (
  directory: string,
  operation: Operation,
  previous: Flight | undefined,
): Flight => {
  const controller = new AbortController();
  const work = after(previous).then(() => operation(controller.signal));
  const flight = { work, controller, joined: 0 };
  flights.set(directory, flight);
  void after(flight).then(() => forget(directory, flight));

  return flight;
};

const current = (directory: string, operation: Operation): Flight => {
  const flight = flights.get(directory);

  return flight && !flight.controller.signal.aborted
    ? flight
    : start(directory, operation, flight);
};

const join = (directory: string, operation: Operation): Flight => {
  const flight = current(directory, operation);
  flight.joined += 1;

  return flight;
};

const leave = (flight: Flight, signal: AbortSignal): void => {
  flight.joined -= 1;

  if (signal.aborted && flight.joined === 0)
    flight.controller.abort(signal.reason);
};

const abortion = (signal: AbortSignal): Abortion => {
  const { promise, reject } = Promise.withResolvers<never>();
  const abandon = (): void => reject(signal.reason);
  signal.addEventListener('abort', abandon, { once: true });

  return {
    aborted: promise,
    stop: () => signal.removeEventListener('abort', abandon),
  };
};

export const singleFlight = async (
  directory: string,
  signal: AbortSignal,
  operation: Operation,
): Promise<void> => {
  signal.throwIfAborted();
  const flight = join(directory, operation);
  const abort = abortion(signal);

  try {
    await Promise.race([flight.work, abort.aborted]);
  } finally {
    abort.stop();
    leave(flight, signal);
  }
};
