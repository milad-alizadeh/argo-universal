import type { Action, OverlayAction } from '@repo/contracts/plugins/wire';
import type { PluginOnEvent } from './plugin-rendering';

export interface ActionTarget {
  key: string;
  path: string[];
  send: PluginOnEvent;
}

export interface OpenOverlay {
  id: number;
  action: OverlayAction;
  target: ActionTarget;
}

export type Answer = 'onConfirm' | 'onDismiss';

export type Flush = () => Promise<void>;

export interface PluginActions {
  overlay: OpenOverlay | null;
  pending: Answer | null;
  registerFlush: (flush: Flush) => () => void;
  run: (action: Action, target: ActionTarget) => Promise<void>;
  finish: (confirmed: boolean, overlayId?: number) => Promise<void>;
}

export interface OverlayView {
  overlay: OpenOverlay | null;
  pending: Answer | null;
}

export interface OverlayState {
  current: OpenOverlay | null;
  busy: boolean;
  generation: number;
  update: React.Dispatch<React.SetStateAction<OverlayView>>;
  flushers: Set<Flush>;
}
