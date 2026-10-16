import Reconciler, { type HostConfig } from 'react-reconciler';
import {
  ConcurrentRoot,
  DefaultEventPriority,
  NoEventPriority,
} from 'react-reconciler/constants';
import type { ReactNode } from 'react';
import type { Instance } from './wire-tree';

type TextInstance = never;

const hostConfig: HostConfig<
  string,
  Record<string, unknown>,
  Instance,
  Instance,
  TextInstance,
  never,
  never,
  never,
  Instance,
  Record<string, never>,
  never,
  number,
  -1,
  null
> = {
  supportsMutation: true,
  supportsPersistence: false,
  supportsHydration: false,
  isPrimaryRenderer: false,
  noTimeout: -1,
  scheduleTimeout: (callback, delay) =>
    setTimeout(callback, delay) as unknown as number,
  cancelTimeout: (id) => clearTimeout(id),
  scheduleMicrotask: (callback) => void Promise.resolve().then(callback),
  supportsMicrotasks: true,
  createInstance: (type, props) => ({ type, props, children: [] }),
  createTextInstance: () => {
    throw new Error('Text must be inside a Text component');
  },
  appendInitialChild: (parent, child) => void parent.children.push(child),
  appendChild: (parent, child) => void parent.children.push(child),
  appendChildToContainer: (parent, child) => void parent.children.push(child),
  insertBefore: (parent, child, before) => insert(parent, child, before),
  insertInContainerBefore: (parent, child, before) =>
    insert(parent, child, before),
  removeChild: (parent, child) => remove(parent, child),
  removeChildFromContainer: (parent, child) => remove(parent, child),
  commitUpdate: (instance, _type, _old, props) => {
    instance.props = props;
  },
  commitTextUpdate: () => {},
  finalizeInitialChildren: () => false,
  shouldSetTextContent: () => false,
  getRootHostContext: () => ({}),
  getChildHostContext: (context) => context,
  getPublicInstance: (instance) => instance,
  prepareForCommit: () => null,
  resetAfterCommit: (container) => notify(container),
  clearContainer: (container) => void (container.children.length = 0),
  preparePortalMount: () => {},
  detachDeletedInstance: () => {},
  getInstanceFromNode: () => null,
  beforeActiveInstanceBlur: () => {},
  afterActiveInstanceBlur: () => {},
  prepareScopeUpdate: () => {},
  getInstanceFromScope: () => null,
  setCurrentUpdatePriority: (priority) => void (current = priority),
  getCurrentUpdatePriority: () => current,
  resolveUpdatePriority: () => (current === NoEventPriority ? DefaultEventPriority : current),
  resolveEventType: () => null,
  resolveEventTimeStamp: () => -1.1,
  shouldAttemptEagerTransition: () => false,
  trackSchedulerEvent: () => {},
  maySuspendCommit: () => false,
  NotPendingTransition: null,
  HostTransitionContext: { $$typeof: Symbol.for('react.context') } as never,
  resetFormInstance: () => {},
  requestPostPaintCallback: () => {},
  startSuspendingCommit: () => {},
  suspendInstance: () => {},
  waitForCommitToBeReady: () => null,
  preloadInstance: () => true,
  unhideInstance: () => {},
  hideInstance: () => {},
  hideTextInstance: () => {},
  unhideTextInstance: () => {},
};

let current: number = DefaultEventPriority;

const listeners = new WeakMap<Instance, () => void>();

function notify(container: Instance): void {
  listeners.get(container)?.();
}

function insert(parent: Instance, child: Instance, before: Instance): void {
  remove(parent, child);
  parent.children.splice(parent.children.indexOf(before), 0, child);
}

function remove(parent: Instance, child: Instance): void {
  const index = parent.children.indexOf(child);

  if (index >= 0) parent.children.splice(index, 1);
}

const reconciler = Reconciler(hostConfig);

export interface Mounted {
  container: Instance;
  render: (element: ReactNode) => void;
  unmount: () => void;
}

// Renders `element` into a fresh container and calls `committed` after every commit.
export function mount(
  element: ReactNode,
  committed: (container: Instance) => void,
  failed: (error: Error) => void,
): Mounted {
  const container: Instance = { type: '#root', props: {}, children: [] };
  listeners.set(container, () => committed(container));
  const noop = (): void => {};
  const root = reconciler.createContainer(
    container,
    ConcurrentRoot,
    null,
    false,
    null,
    'argo',
    failed,
    failed,
    noop,
    noop,
  );
  const render = (next: ReactNode): void =>
    void reconciler.updateContainer(next, root, null, null);

  render(element);

  return { container, render, unmount: () => render(null) };
}
