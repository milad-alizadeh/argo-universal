import type { ProfilerOnRenderCallback } from 'react';

// What one component name did while counting. Counts don't change with machine load; timings do, so none are kept.
export interface RenderCount {
  mounts: number;
  // The props of each update, so a test can say which instance rendered.
  updates: object[];
  // The props that differed across its updates. Empty means state, context or a parent that passed equal props.
  changedProps: string[];
}

export type RenderCounts = Record<string, RenderCount>;

export interface RenderCounter {
  id: string;
  onRender: ProfilerOnRenderCallback;
  // What rendered under the `<Profiler>` during `action`, which awaits what it should have drawn.
  during: (
    element: Element,
    action: () => Promise<void> | void,
  ) => Promise<RenderCounts>;
}

interface Drawn {
  displayName?: string;
  name?: string;
  render?: Drawn;
}

// The fields of React's fiber that its own DevTools read to tell what rendered. Private to React, so a counter that finds nothing throws rather than reporting a clean zero.
interface Fiber {
  tag: number;
  type: Drawn;
  child: Fiber | null;
  sibling: Fiber | null;
  return: Fiber | null;
  alternate: Fiber | null;
  flags: number;
  memoizedProps: object | null;
  stateNode: FiberRoot;
}

interface FiberRoot {
  current: Fiber;
}

const hostRootTag = 3;

const profilerTag = 12;

// Function, class, forwardRef and simple memo: the fibers that run a component. A plain memo's inner function has its own.
const renderingTags = new Set([0, 1, 11, 15]);

const fiberKeyPrefix = '__reactFiber$';

function fiberOf(element: Element): Fiber | undefined {
  return Object.entries(element).find(([key]) =>
    key.startsWith(fiberKeyPrefix),
  )?.[1];
}

function drawnFiber(element: Element): Fiber {
  const fiber = [element, ...element.querySelectorAll('*')]
    .map(fiberOf)
    .find(Boolean);

  if (!fiber) throw new Error('No React tree is drawn in this element');

  return fiber;
}

function rootOf(element: Element): FiberRoot {
  let fiber = drawnFiber(element);

  while (fiber.return) fiber = fiber.return;

  if (fiber.tag !== hostRootTag)
    throw new Error('The React tree does not end in a host root');

  return fiber.stateNode;
}

const drawnBy = ({ type }: Fiber): Drawn => type.render ?? type;

const nameOf = (fiber: Fiber): string => {
  const { displayName, name } = drawnBy(fiber);

  return displayName ?? name ?? 'Anonymous';
};

function childrenOf(fiber: Fiber): Fiber[] {
  const children: Fiber[] = [];

  for (let child = fiber.child; child; child = child.sibling)
    children.push(child);

  return children;
}

const propsOf = (fiber: Fiber | null): Map<string, unknown> =>
  new Map(Object.entries(fiber?.memoizedProps ?? {}));

function changedPropsOf(fiber: Fiber): string[] {
  const before = propsOf(fiber.alternate);
  const after = propsOf(fiber);

  return [...new Set([...before.keys(), ...after.keys()])].filter(
    (key) => before.get(key) !== after.get(key),
  );
}

// React's PerformedWork flag is the lowest bit.
const performedWork = ({ flags }: Fiber): boolean => flags % 2 === 1;

const rendered = (fiber: Fiber): boolean =>
  renderingTags.has(fiber.tag) && (!fiber.alternate || performedWork(fiber));

function recordUpdate(count: RenderCount, fiber: Fiber): void {
  count.updates.push(fiber.memoizedProps ?? {});
  count.changedProps = [
    ...new Set([...count.changedProps, ...changedPropsOf(fiber)]),
  ];
}

function record(counts: RenderCounts, fiber: Fiber): void {
  const name = nameOf(fiber);
  const count = (counts[name] ??= { mounts: 0, updates: [], changedProps: [] });

  if (fiber.alternate) recordUpdate(count, fiber);
  else count.mounts += 1;
}

function recordRendered(counts: RenderCounts, fiber: Fiber): void {
  if (rendered(fiber)) record(counts, fiber);
}

const isProfiler = (fiber: Fiber, id: string): boolean =>
  fiber.tag === profilerTag && propsOf(fiber).get('id') === id;

interface Walk {
  id: string;
  counts: RenderCounts;
}

const sameChildren = ({ alternate, child }: Fiber): boolean =>
  alternate?.child === child;

// As React DevTools walks a commit: a fiber whose children are last commit's objects rendered nothing below it.
function visit(fiber: Fiber, counting: boolean, walk: Walk): void {
  if (counting) recordRendered(walk.counts, fiber);

  visitChildren(fiber, counting || isProfiler(fiber, walk.id), walk);
}

function visitChildren(fiber: Fiber, counting: boolean, walk: Walk): void {
  if (sameChildren(fiber)) return;

  for (const child of childrenOf(fiber)) visit(child, counting, walk);
}

interface Counting extends Walk {
  root: FiberRoot;
}

function visitRoot(counting: Counting | undefined): void {
  if (counting) visit(counting.root.current, false, counting);
}

function requireRenders(counts: RenderCounts, id: string): RenderCounts {
  if (Object.keys(counts).length) return counts;

  throw new Error(
    `Nothing rendered under the Profiler "${id}". Is it drawn, and did the action change it?`,
  );
}

/*
 * Counts which components render under a `<Profiler>`, as the DevTools Profiler does, without touching
 * the code it counts. A `<Profiler>` alone says only that something in its subtree committed; this also
 * says what. Web only: it finds the tree through the DOM. Storybook does not run React Compiler and the
 * App does, so a count here can be higher than the App's, never lower.
 *
 *   const renders = renderCounter();
 *   <Profiler id={renders.id} onRender={renders.onRender}>…</Profiler>
 *   const counts = await renders.during(canvasElement, () => send());
 */
export function renderCounter(id = 'counted'): RenderCounter {
  let active: Counting | undefined;

  return {
    id,
    onRender: () => visitRoot(active),
    during: async (element, action) => {
      const counting = { id, root: rootOf(element), counts: {} };
      active = counting;
      await Promise.resolve(action()).finally(() => {
        active = undefined;
      });

      return requireRenders(counting.counts, id);
    },
  };
}
