import { AsyncLocalStorage } from 'node:async_hooks';
import { pagedListRead } from '@repo/contracts/plugins/argo-calls';
import type { JsonObject } from '@repo/contracts/plugins/hook-protocol';
import type { PluginEvent } from '@repo/contracts/plugins/wire';
import { z } from 'zod';

const id = z.number().int().nonnegative();

/*
 * What a worker's call runs for, as the event that started its code said: a draw or an Operation run by
 * id, which the Server looks up rather than trusts, or the Project a Hook or a named read runs for; or
 * nothing, as code its Plugin runs as it registers.
 */
export const CallOrigin = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('draw'), draw: id }),
  z.strictObject({ kind: z.literal('operation'), operation: id }),
  z.strictObject({ kind: z.literal('project'), projectId: z.string().min(1) }),
  z.strictObject({ kind: z.literal('none') }),
]);

export type CallOrigin = z.infer<typeof CallOrigin>;

const none: CallOrigin = { kind: 'none' };

const ProjectId = z.string().min(1);

const forProject = (projectId: string | undefined): CallOrigin =>
  projectId ? { kind: 'project', projectId } : none;

// A Hook's event is the Plugin-facing JSON of its kind; only a Hook for a Project names one.
const HookProject = z.object({ projectId: ProjectId });

type EventOfType<Type extends PluginEvent['type']> = Extract<
  PluginEvent,
  { type: Type }
>;

/*
 * Each event the worker hands Plugin code names what it runs for. A page of a paged list runs for the draw
 * reading it, so it reaches what that draw reaches; a named read runs for its Query's Project alone, as its
 * answer is kept for every App. One batched items call can hold several Projects, so it runs for none.
 */
// What each kind of event runs for; a new kind fails type-checking until it says.
type EventOrigins = {
  [Type in PluginEvent['type']]: (event: EventOfType<Type>) => CallOrigin;
};

const eventOrigins: EventOrigins = {
  draw: ({ id }) => ({ kind: 'draw', draw: id }),
  stop: ({ id }) => ({ kind: 'draw', draw: id }),
  operation: ({ id }) => ({ kind: 'operation', operation: id }),
  read: ({ name, draw, projectId }) =>
    name === pagedListRead && draw !== undefined
      ? { kind: 'draw', draw }
      : forProject(projectId),
  slotItems: () => none,
};

const eventOrigin = <Type extends PluginEvent['type']>(
  event: EventOfType<Type>,
): CallOrigin => {
  const origin: (event: EventOfType<Type>) => CallOrigin =
    eventOrigins[event.type];

  return origin(event);
};

// What the worker delivers to Plugin code: an event, a Hook invocation for its Project, or an Account's token ask.
export type Delivered =
  | { type: 'event'; event: PluginEvent }
  | { type: 'hook'; event: JsonObject }
  | { type: 'accountToken' };

export function originOf(delivered: Delivered): CallOrigin {
  if (delivered.type === 'event') return eventOrigin(delivered.event);

  if (delivered.type === 'hook') return hookOrigin(delivered.event);

  return none;
}

const hookOrigin = (event: JsonObject): CallOrigin =>
  forProject(HookProject.safeParse(event).data?.projectId);

/*
 * The worker runs each delivery inside its origin, which the Plugin code's awaits keep, so every `argo` call
 * the code makes carries the origin it runs in.
 */
export class CallScope {
  private readonly store = new AsyncLocalStorage<CallOrigin>();

  public run<T>(origin: CallOrigin, run: () => T): T {
    return this.store.run(origin, run);
  }

  public current(): CallOrigin {
    return this.store.getStore() ?? none;
  }
}

// What a call may reach on the Server: a Project, and whether its App is the Server Device.
type Reach = { projectId?: string; serverDevice: boolean };

// A reach that also holds the draw the call is for.
export type DrawReach<Draw> = Reach & { drawn?: Draw };

// The draws and Operation runs still waiting on the calling worker generation, by id.
export type WaitingCalls<Draw extends Reach> = {
  draw: (id: number) => Draw | undefined;
  run: (id: number) => Reach | undefined;
};

const reachesNothing: DrawReach<never> = { serverDevice: false };

/*
 * A call reaches what the draw or the Operation run it is for reaches: its Project and Server Device. A draw or
 * run that has already answered reaches neither. A call for a Project reaches that Project and never the Server
 * Device; a call for nothing reaches nothing.
 */
export function reachOf<Draw extends Reach>(
  waiting: WaitingCalls<Draw>,
  origin: CallOrigin,
): DrawReach<Draw> {
  if (origin.kind === 'draw') return reachOfDraw(waiting.draw(origin.draw));

  if (origin.kind === 'operation')
    return reachOfRun(waiting.run(origin.operation));

  return reachOfProject(origin);
}

// A call for a Project reaches that Project and never the Server Device.
function reachOfProject(
  origin: Extract<CallOrigin, { kind: 'project' | 'none' }>,
): DrawReach<never> {
  switch (origin.kind) {
    case 'project':
      return { projectId: origin.projectId, serverDevice: false };
    case 'none':
      return reachesNothing;
  }
}

const reachOfDraw = <Draw extends Reach>(
  draw: Draw | undefined,
): DrawReach<Draw> =>
  draw
    ? {
        projectId: draw.projectId,
        serverDevice: draw.serverDevice,
        drawn: draw,
      }
    : reachesNothing;

const reachOfRun = (run: Reach | undefined): DrawReach<never> =>
  run
    ? { projectId: run.projectId, serverDevice: run.serverDevice }
    : reachesNothing;
