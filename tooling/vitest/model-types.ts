import type { AnyStateMachine, EventObject, InputFrom } from 'xstate';
import type { EventExecutor, StatePath, TraversalOptions } from 'xstate/graph';
import type { Running } from './model-delay';
import type { DelayEvent } from './model-edges';

// The snapshot the graph search produces, as the model-graph wrappers type it.
export type SnapshotOf<TMachine extends AnyStateMachine> = ReturnType<
  TMachine['transition']
>;

// What makes two snapshots one vertex of the graph; two snapshots with the same vertex are explored once.
export type Vertex = string | object;

export type Check<
  TMachine extends AnyStateMachine,
  TEvent extends EventObject,
> = (snapshot: SnapshotOf<TMachine>, event: TEvent | DelayEvent) => boolean;

// One way to walk the machine: the graph search and what it distinguishes, permits and stops at.
export interface ModelWalk<
  TMachine extends AnyStateMachine,
  TEvent extends EventObject,
> {
  name: string;
  search: 'shortest' | 'simple';
  // Each step into a state gets its own vertex by default, so shortest paths walk every transition; polling loops give thousands of simple paths that way.
  arrivals?: boolean;
  // Events this walk drives besides the model's.
  fixtures?: TEvent[];
  // The model's own by default.
  vertex?: (snapshot: SnapshotOf<TMachine>) => Vertex;
  permits?: Check<TMachine, TEvent>;
  stopWhen?: (snapshot: SnapshotOf<TMachine>) => boolean;
}

// What every walk of one machine shares.
export interface ModelTraversal<
  TMachine extends AnyStateMachine,
  TEvent extends EventObject,
> {
  input: InputFrom<TMachine>;
  fixtures: TEvent[];
  vertex: (snapshot: SnapshotOf<TMachine>) => Vertex;
  // Beyond what the machine itself accepts through `snapshot.can`.
  permits?: Check<TMachine, TEvent>;
  limit?: number;
}

// What one walk of a model searches with.
export interface Walked<
  TMachine extends AnyStateMachine,
  TEvent extends EventObject,
> {
  machine: TMachine;
  model: ModelTraversal<TMachine, TEvent>;
  walk: ModelWalk<TMachine, TEvent>;
}

// The fixtures, and the delayed events the machine names itself.
export type ModelEvent<TEvent extends EventObject> = TEvent | DelayEvent;

export type ModelPaths<
  TMachine extends AnyStateMachine,
  TEvent extends EventObject,
> = StatePath<SnapshotOf<TMachine>, TEvent | DelayEvent>[];

export type ModelStep<
  TMachine extends AnyStateMachine,
  TEvent extends EventObject,
> = ModelPaths<TMachine, TEvent>[number]['steps'][number];

export type ModelOptions<
  TMachine extends AnyStateMachine,
  TEvent extends EventObject,
> = TraversalOptions<
  SnapshotOf<TMachine>,
  TEvent | DelayEvent,
  InputFrom<TMachine>
>;

// What a statechart's model test supplies: fixtures for the events its edges need, and how to drive and check the real actor.
export interface ModelSpec<
  TMachine extends AnyStateMachine,
  TEvent extends EventObject,
> extends ModelTraversal<TMachine, TEvent> {
  walks: ModelWalk<TMachine, TEvent>[];
  // The actor of the running test, which delayed events wait on.
  running: () => Running;
  start: () => void;
  // Drives each event the model sends, by event type; a delayed event needs none, its timer fires.
  executors: Record<
    string,
    EventExecutor<SnapshotOf<TMachine>, TEvent | DelayEvent>
  >;
  // Checked after every step, then the check of each state the step is in.
  always?: (snapshot: SnapshotOf<TMachine>) => void;
  states: Record<string, (snapshot: SnapshotOf<TMachine>) => void>;
  // A suffix for the title of an event that carries data.
  label?: (event: TEvent | DelayEvent) => string | undefined;
}

// One generated path, to run against the real actor.
export interface ModelCase {
  title: string;
  run: () => Promise<void>;
}

export interface ModelSuite {
  name: string;
  cases: ModelCase[];
}

export interface Model {
  suites: ModelSuite[];
  // The transitions of the machine that no generated path walks; a test expects none.
  unwalked: () => string[];
}
