import {
  canGraphEvent,
  events,
  output,
  type ServerEvent,
} from './server-machine-model-events.mocks';
import {
  input,
  type ServerSnapshot,
  staleAddress,
} from './server-machine.mocks';

// Never the address itself, only whose it is.
type Vertex = {
  value: ServerSnapshot['value'];
  address: number | null;
  ownedPid: ServerSnapshot['context']['ownedPid'];
  failure: boolean;
  running: number;
};

const vertex = (snapshot: ServerSnapshot): Vertex => ({
  value: snapshot.value,
  address: snapshot.context.address?.pid ?? null,
  ownedPid: snapshot.context.ownedPid,
  failure: snapshot.context.failure !== null,
  running: snapshot.context.running,
});

export const options = {
  input,
  events,
  // A done actor ignores events, but traversal still leaves a final state through the root `on`; a stale server.json only matters while the spawned Supervisor answers.
  filterEvents: (snapshot: ServerSnapshot, event: ServerEvent): boolean =>
    snapshot.status === 'active' && permitsEvent(snapshot, event),
  // `via` gives each step into a state its own vertex, so the shortest paths walk every transition.
  serializeState: (
    snapshot: ServerSnapshot,
    event: ServerEvent | undefined,
    previous?: ServerSnapshot,
  ): string =>
    JSON.stringify({
      ...vertex(snapshot),
      via: event && `${JSON.stringify(previous?.value)} ${event.type}`,
    }),
};

function permitsEvent(snapshot: ServerSnapshot, event: ServerEvent): boolean {
  return (
    canGraphEvent(snapshot, event) &&
    (output(event) !== staleAddress ||
      snapshot.matches({ starting: { answering: 'checking' } }))
  );
}

// Without `via`: with it, the polling loops give thousands of simple paths.
export const simplePathOptions = {
  ...options,
  serializeState: (snapshot: ServerSnapshot): string =>
    JSON.stringify(vertex(snapshot)),
};
