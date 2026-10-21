import type { ReactNode } from 'react';
import Reconciler, { type OpaqueRoot } from 'react-reconciler';
import { ConcurrentRoot } from 'react-reconciler/constants';
import { hostConfig, reportFailure } from './host-config';
import type { Instance } from './wire-tree';

const reconciler = Reconciler(hostConfig);

// A published frame can finish a headless pass, so its passive effects must run first.
export function flushEffects(): void {
  reconciler.flushPassiveEffects();
}

const nothing = (): void => {};

export interface Mounted {
  container: Instance;
  render: (element: ReactNode) => void;
  unmount: () => void;
}

// Tag, hydration callbacks, strict mode, concurrent default and identifier prefix.
const rootSettings = [ConcurrentRoot, null, false, null, 'argo'] as const;

function createRoot(
  container: Instance,
  failed: (error: Error) => void,
): OpaqueRoot {
  return reconciler.createContainer(
    container,
    ...rootSettings,
    failed,
    failed,
    nothing,
    nothing,
  );
}

// Renders `element` into a fresh container and calls `committed` after every commit.
export function mount(
  element: ReactNode,
  committed: (container: Instance) => void,
  failed: (error: Error) => void = reportFailure,
): Mounted {
  const container: Instance = { type: '#root', props: {}, children: [] };
  const root = createRoot(container, failed);

  container.onCommit = (): void => committed(container);

  const render = (next: ReactNode): void => {
    reconciler.updateContainer(next, root, null, null);
  };

  render(element);

  return { container, render, unmount: () => render(null) };
}
