import type { AnyStateMachine, EventObject, InputFrom } from 'xstate';
import type { DelayEvent } from './model-edges';

// The snapshot the graph search produces.
export type SnapshotOf<TMachine extends AnyStateMachine> = ReturnType<
  TMachine['transition']
>;

// The fixtures, and the delayed events the machine names itself.
export type ModelEvent<TEvent extends EventObject> = TEvent | DelayEvent;

// What makes two snapshots one vertex of the graph; two snapshots with the same vertex are explored once.
export type Vertex = string | object;

export type Check<
  TMachine extends AnyStateMachine,
  TEvent extends EventObject,
> = (snapshot: SnapshotOf<TMachine>, event: ModelEvent<TEvent>) => boolean;

// How a step reached its state, added to the step's vertex; called only for a step with a state before it.
export type Arrival<
  TMachine extends AnyStateMachine,
  TEvent extends EventObject,
> = (
  snapshot: SnapshotOf<TMachine>,
  event: ModelEvent<TEvent>,
  previous: SnapshotOf<TMachine>,
) => string;

// One way to walk the machine: the graph search and what it distinguishes, permits and stops at.
export interface ModelWalk<
  TMachine extends AnyStateMachine,
  TEvent extends EventObject,
> {
  name: string;
  search: 'shortest' | 'simple';
  // Each step into a state gets its own vertex by default, keyed by the state it came from and the event, so shortest paths walk every transition; polling loops give thousands of simple paths that way.
  arrivals?: boolean;
  // Replaces the default arrival.
  arrival?: Arrival<TMachine, TEvent>;
  // The model's own by default.
  input?: InputFrom<TMachine>;
  // Events this walk drives besides the model's.
  fixtures?: TEvent[];
  // The model's own by default.
  vertex?: (snapshot: SnapshotOf<TMachine>) => Vertex;
  permits?: Check<TMachine, TEvent>;
  stopWhen?: (snapshot: SnapshotOf<TMachine>) => boolean;
  // Keeps the paths that are a prefix of another; dropped by default.
  prefixes?: boolean;
}

// What builds the graph: the events a machine's edges need, what its states are, and the ways to walk it.
export interface ModelGraph<
  TMachine extends AnyStateMachine,
  TEvent extends EventObject,
> {
  input: InputFrom<TMachine>;
  // The snapshot every walk starts from instead of the machine's initial one.
  from?: SnapshotOf<TMachine>;
  fixtures: TEvent[];
  // Event types the model never sends, although the machine has edges for them.
  omitted?: string[];
  vertex: (snapshot: SnapshotOf<TMachine>) => Vertex;
  // Whether the machine takes a fixture; `snapshot.can` by default, and always for a delayed event.
  accepts?: (snapshot: SnapshotOf<TMachine>, event: TEvent) => boolean;
  // Narrows what the machine accepts.
  permits?: Check<TMachine, TEvent>;
  // What tells two events apart, in arrivals, in the search and in coverage; the event's type by default.
  eventKey?: (event: ModelEvent<TEvent>) => string;
  // What tells two states apart in coverage; the state value by default.
  stateKey?: (snapshot: SnapshotOf<TMachine>) => string;
  limit?: number;
  walks: ModelWalk<TMachine, TEvent>[];
}

// What one walk of a model searches with.
export interface Walked<
  TMachine extends AnyStateMachine,
  TEvent extends EventObject,
> {
  machine: TMachine;
  graph: ModelGraph<TMachine, TEvent>;
  walk: ModelWalk<TMachine, TEvent>;
}
