import {
  DefaultEventPriority,
  NoEventPriority,
} from 'react-reconciler/constants';
import { keyOfProps, toProps, type ElementProps } from './element-props';
import type { KitHostConfig } from './host-types';
import { kitScheduler } from './kit-scheduler';
import { transitionContext } from './transition-context';
import type { Instance } from './wire-tree';

const noTimeout = -1;

const noTimestamp = -1;

let current: number = DefaultEventPriority;

export const reportFailure = (error: Error): void => {
  void Promise.reject(error);
};

function remove(parent: Instance, child: Instance): void {
  const index = parent.children.indexOf(child);

  if (index >= 0) parent.children.splice(index, 1);
}

function insert(parent: Instance, child: Instance, before: Instance): void {
  remove(parent, child);
  parent.children.splice(parent.children.indexOf(before), 0, child);
}

function append(parent: Instance, child: Instance): void {
  remove(parent, child);
  parent.children.push(child);
}

function create(type: string, props: ElementProps): Instance {
  return {
    type,
    key: keyOfProps(props),
    props: toProps(type, props),
    children: [],
  };
}

function setPriority(priority: number): void {
  current = priority;
}

const resolvePriority = (): number =>
  current === NoEventPriority ? DefaultEventPriority : current;

const nothing = (): void => {};

export const hostConfig: KitHostConfig = {
  supportsMutation: true,
  supportsPersistence: false,
  supportsHydration: false,
  isPrimaryRenderer: false,
  noTimeout,
  scheduleTimeout: (callback, delay) => kitScheduler.schedule(callback, delay),
  cancelTimeout: (id) => kitScheduler.cancel(id),
  scheduleMicrotask: (callback) => {
    Promise.resolve().then(callback).catch(reportFailure);
  },
  supportsMicrotasks: true,
  createInstance: create,
  createTextInstance: () => {
    throw new Error('Text must be inside a Text component');
  },
  appendInitialChild: append,
  appendChild: append,
  appendChildToContainer: append,
  insertBefore: insert,
  insertInContainerBefore: insert,
  removeChild: remove,
  removeChildFromContainer: remove,
  // React passes (instance, type, oldProps, newProps); only the last matters here.
  commitUpdate: (...[instance, type, , props]) => {
    instance.props = toProps(type, props);
    instance.key = keyOfProps(props);
  },
  commitTextUpdate: nothing,
  finalizeInitialChildren: () => false,
  shouldSetTextContent: () => false,
  getRootHostContext: () => ({}),
  getChildHostContext: (context) => context,
  getPublicInstance: (instance) => instance,
  prepareForCommit: () => null,
  resetAfterCommit: (container) => {
    container.onCommit?.();
  },
  clearContainer: (container) => {
    container.children.length = 0;
  },
  preparePortalMount: nothing,
  detachDeletedInstance: nothing,
  getInstanceFromNode: () => null,
  beforeActiveInstanceBlur: nothing,
  afterActiveInstanceBlur: nothing,
  prepareScopeUpdate: nothing,
  getInstanceFromScope: () => null,
  setCurrentUpdatePriority: setPriority,
  getCurrentUpdatePriority: () => current,
  resolveUpdatePriority: resolvePriority,
  resolveEventType: () => null,
  resolveEventTimeStamp: () => noTimestamp,
  shouldAttemptEagerTransition: () => false,
  trackSchedulerEvent: nothing,
  maySuspendCommit: () => false,
  NotPendingTransition: null,
  HostTransitionContext: transitionContext(),
  resetFormInstance: nothing,
  requestPostPaintCallback: nothing,
  startSuspendingCommit: nothing,
  suspendInstance: nothing,
  waitForCommitToBeReady: () => null,
  preloadInstance: () => true,
  unhideInstance: nothing,
  hideInstance: nothing,
  hideTextInstance: nothing,
  unhideTextInstance: nothing,
};
