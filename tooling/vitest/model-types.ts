import type {
  AnyActorRef,
  AnyMachineSnapshot,
  AnyStateMachine,
  EventObject,
  InputFrom,
} from 'xstate';
import type { EventExecutor, StatePath, TraversalOptions } from 'xstate/graph';
import type { ModelEvent, ModelGraph, SnapshotOf } from './model-walk';

export type ModelPaths<
  TMachine extends AnyStateMachine,
  TEvent extends EventObject,
> = StatePath<SnapshotOf<TMachine>, ModelEvent<TEvent>>[];

// One step of a generated path: the event sent and the state it leads to.
export type PathStep<
  TSnapshot extends AnyMachineSnapshot = AnyMachineSnapshot,
  TEvent extends EventObject = EventObject,
> = StatePath<TSnapshot, TEvent>['steps'][number];

export type ModelStep<
  TMachine extends AnyStateMachine,
  TEvent extends EventObject,
> = PathStep<SnapshotOf<TMachine>, ModelEvent<TEvent>>;

export type ModelOptions<
  TMachine extends AnyStateMachine,
  TEvent extends EventObject,
> = TraversalOptions<
  SnapshotOf<TMachine>,
  ModelEvent<TEvent>,
  InputFrom<TMachine>
>;

// The actor of the path being run.
export type Running = AnyActorRef;

// What one path's run keeps: its actor, and when each delay set so far falls due.
export interface PathRun {
  actor: Running | undefined;
  due: Map<string, number>;
}

// The milliseconds a named delay declares: a constant, or a function of the snapshot the delay was set in, as the machine's own delay is.
export type DeclaredDelay<TMachine extends AnyStateMachine> =
  | number
  | ((snapshot: SnapshotOf<TMachine>) => number);

// What drives and checks the real actor along each path.
export interface ModelActor<
  TMachine extends AnyStateMachine,
  TEvent extends EventObject,
> {
  // Starts the actor of one path with the graph's input.
  start: (input: InputFrom<TMachine>) => Running;
  // Drives each event the model sends, by event type; a delayed event needs none, its timer fires.
  executors: Record<
    string,
    EventExecutor<SnapshotOf<TMachine>, ModelEvent<TEvent>>
  >;
  // Each delay the machine names, by delay name, with the milliseconds it must wait: stated here, not read from the actor, so a wrong delay fails.
  delays: Record<string, DeclaredDelay<TMachine>>;
  // Checked after every step, then the check of each state the step is in.
  always?: (snapshot: SnapshotOf<TMachine>) => void;
  states: Record<string, (snapshot: SnapshotOf<TMachine>) => void>;
  // A suffix for the title of an event that carries data.
  label?: (event: ModelEvent<TEvent>) => string | undefined;
}

// The machine with everything its paths are driven by.
export interface Modelled<
  TMachine extends AnyStateMachine,
  TEvent extends EventObject,
> {
  machine: TMachine;
  graph: ModelGraph<TMachine, TEvent>;
  actor: ModelActor<TMachine, TEvent>;
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

// A graph walked without an actor: its generated paths, and the transitions of the machine they miss.
export interface WalkedGraph<
  TMachine extends AnyStateMachine,
  TEvent extends EventObject,
> {
  paths: ModelPaths<TMachine, TEvent>;
  unwalked: () => string[];
}

export interface Model {
  suites: ModelSuite[];
  // The transitions of the machine that no generated path walks; a test expects none.
  unwalked: () => string[];
}
